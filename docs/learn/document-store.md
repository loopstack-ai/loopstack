---
title: Why Documents Exist
description: The distinction between workflow state (internal data) and documents (visible output). How the document store connects workflows to the Studio UI and the LLM context.
---

# Why Documents Exist

Loopstack separates workflow data into two distinct concepts: **state** and **documents**. This page explains why they're different, what each one is for, and how the document store connects workflows to both the Studio UI and the LLM.

---

## The Distinction

### State — Internal Workflow Data

State is the data your workflow carries between transitions. It's typed, private, and never shown to users directly:

```typescript
interface ReviewState {
  draft?: string;
  reviewerId?: string;
  score?: number;
}
```

State is loaded from the latest checkpoint before each transition and saved after. It's how your workflow remembers what it has done so far.

### Documents — Published Workflow Output

Documents are data that a workflow explicitly publishes for external consumption. They're saved to the database and rendered in the Studio UI:

```typescript
await this.documentStore.save(MarkdownDocument, {
  text: '# Summary\n\n' + summary,
});
```

Documents are how the workflow communicates outward — to users reviewing output, to human approvers in the Studio UI, and to the LLM as conversation history.

---

## Why They're Separate

The separation exists because state and documents serve different purposes with different lifecycles.

**State** is implementation detail. It changes constantly as the workflow processes — fields get added, updated, and removed. It's not meant to be read directly by users or LLMs.

**Documents** are an append-only record of what the workflow has produced. They accumulate over the course of a run and form a readable history: the chat messages, the AI-generated output, the form the user filled in, the error that occurred.

This distinction also makes the HITL pattern clean. When you want a human to review something, you save it as a document — it appears in Studio. The human edits it, clicks a button, and the workflow receives the updated content as a transition payload. The document is the communication channel.

---

## How Documents Persist

Every `this.documentStore.save()` call writes a `DocumentEntity` row to PostgreSQL. The document is linked to:

- The workflow run (`workflowId`)
- The workspace (`workspaceId`)
- The specific transition that created it
- The place the workflow was in when it was created

Documents are written **inside the active transition's database transaction**. If the transition fails and rolls back, documents saved during that transition are also rolled back — they never existed as far as the database is concerned.

This is why document output is always consistent with workflow state: you can't have a document from a transition that "didn't happen" from the state machine's perspective.

> **In stateless workflows** (e.g. `runSync({ stateless: true })`), documents are kept **in memory only** for the duration of the run. `save()`, `findAll()`, and `findByTag()` work normally within the run, but nothing is written to the database — the documents live as long as the call and are returned with the result.

### Replacing a Document

By default, each `save()` call creates a new document row at the end of the feed. To replace an existing document at its current position, pass a stable `key`:

```typescript
// First save — creates document with key 'output-1'
await this.documentStore.save(ResultDocument, { text: 'Draft...' }, { key: 'output-1' });

// Later save — creates a new row with the same key, invalidates the old one
await this.documentStore.save(ResultDocument, { text: 'Final version' }, { key: 'output-1' });
```

Under the hood: the old document row is marked `isInvalidated: true`, and a new row is inserted at the same display position. Studio shows only the latest version. The effect is that the document appears to update in place, while keeping an immutable document history.

---

## Validation

Documents have a Zod schema (from the `@Document` decorator). When you call `save()`, content is validated against this schema before writing. The validation mode is controlled by the `validate` save option.

| Mode                 | Behavior                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'strict'` (default) | Throws `SchemaValidationError` (with the document name and field-level Zod issues) if content fails the schema. Because saves run inside a transition, the throw rolls back the whole transition — no document is persisted and the workflow stays at the previous place. |
| `'safe'`             | Validates non-throwing: stores the parsed (possibly partial) data **plus** the `ZodError` on the document's `error` field. Save succeeds either way.                                                                                                                      |
| `'skip'`             | Bypasses validation entirely. The raw content is stored as-is. No `error` is attached.                                                                                                                                                                                    |

```typescript
// Strict (default) — throws if invalid
await this.documentStore.save(NotesDocument, content, { key: 'notes' });

// Safe — keeps partial data, attaches the ZodError for inspection
await this.documentStore.save(NotesDocument, content, { key: 'notes', validate: 'safe' });

// Skip — raw write, no Zod check
await this.documentStore.save(OptimizedNotesDocument, llmResult.data, { key: 'notes', validate: 'skip' });
```

`'safe'` and `'skip'` are most useful for LLM-generated content where the model's output may have minor deviations (empty strings, missing optional fields) that you want the user to review and correct in the UI before confirming.

---

## Documents as LLM Context

The document store is also the LLM's memory. When you call an LLM tool without an explicit prompt, it scans the document store for all documents tagged `'message'` in the current run and builds the conversation history automatically. `LlmMessageDocument` carries this tag by default; `MessageDocument` does not, so plain UI bubbles never leak into the LLM context.

```typescript
// No prompt — LLM reads all LlmMessageDocument records as history
const result = await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
```

> **Want a `MessageDocument` to feed into history too?** Save it with an explicit `tags: ['message']` override, or change the search tag via the tool's `messagesSearchTag` config. By default they're UI-only.

The LLM sees the messages in the order they were saved — user messages, assistant responses, tool calls, tool results. Adding a new user message to the document store before calling the LLM is how you extend the conversation:

```typescript
// Save user message → LLM will see it as the next turn
await this.documentStore.save(LlmMessageDocument, { role: 'user', text: userInput });

// LLM call includes all prior messages + the new user message
const result = await this.llmGenerateText.call({}, { config: { provider: 'claude' } });
```

This is why multi-turn chat works without manually managing a messages array. The document store is the messages array.

### Hidden LLM Context

Sometimes you want to seed the LLM with context — a system prompt, prior steps, background info — without showing it as a chat bubble in Studio. Save it as an `LlmContextDocument` instead of an `LlmMessageDocument`:

```typescript
// System prompt — LLM reads it as conversation history, Studio doesn't show it
await this.documentStore.save(LlmContextDocument, { role: 'user', text: systemPromptText });
```

`LlmContextDocument` is declared with `@Document({ internal: true, tags: ['message'] })`. The `internal: true` flag tells the framework to exclude these rows from API responses and live updates (so Studio never sees them), while `tags: ['message']` ensures the LLM provider still picks them up when building conversation history.

For any document type that's pure framework plumbing — never user-facing — declare `internal: true` on its `@Document` decorator to apply the same filter.

---

## Built-in Document Types

You don't always need to create custom documents. The built-in types cover the most common cases:

| Document             | Source                           | Use case                                                                                                                                                             |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LlmMessageDocument` | `@loopstack/llm-provider-module` | Visible chat messages — user and assistant turns, tool calls, tool results. Collected into LLM history by default.                                                   |
| `LlmContextDocument` | `@loopstack/llm-provider-module` | Internal LLM context — system prompts, background info. Picked up by the LLM provider as conversation history but excluded from Studio's document responses.         |
| `MessageDocument`    | `@loopstack/common`              | UI-only role/text bubbles (status updates, narrative). Not collected into LLM history.                                                                               |
| `MarkdownDocument`   | `@loopstack/common`              | Rich text output rendered as formatted markdown                                                                                                                      |
| `PlainDocument`      | `@loopstack/common`              | Plain text output                                                                                                                                                    |
| `LinkDocument`       | `@loopstack/common`              | Status card / inline embed for sub-workflow runs. Auto-saved by `subWorkflow.run()` based on the `show` option; live status derived from the child workflow's state. |
| `ErrorDocument`      | `@loopstack/common`              | Error messages, automatically saved on transition failure                                                                                                            |

Custom documents are for when you need structured forms, interactive fields, or action buttons — see the [Creating Documents](../build/fundamentals/documents.md) guide.

---

## Next Steps

- [Creating Documents](../build/fundamentals/documents.md) — custom schemas, YAML widgets, form actions
- [How the Workflow Engine Works](./workflow-engine.md) — how documents fit into the transaction and rollback model
- [Architecture Overview](./architecture.md) — where documents live in the broader system
