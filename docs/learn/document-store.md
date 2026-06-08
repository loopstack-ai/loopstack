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
await this.documentStore.save(LlmMessageDocument, {
  role: 'assistant',
  content: result.data!.message.content,
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

### Replacing a Document

By default, each `save()` call creates a new document row at the end of the feed. To replace an existing document at its current position, pass a stable `id`:

```typescript
// First save — creates document with ID 'output-1'
await this.documentStore.save(ResultDocument, { text: 'Draft...' }, { id: 'output-1' });

// Later save — creates a new row with the same ID, invalidates the old one
await this.documentStore.save(ResultDocument, { text: 'Final version' }, { id: 'output-1' });
```

Under the hood: the old document row is marked `isInvalidated: true`, and a new row is inserted at the same display position. Studio shows only the latest version. The effect is that the document appears to update in place, while keeping an immutable document history.

---

## Validation

Documents have a Zod schema (from the `@Document` decorator). When you call `save()`, content is validated against this schema before writing.

For LLM-generated content, validation can be loosened:

```typescript
await this.documentStore.save(OptimizedNotesDocument, llmResult.data, { id: 'notes', validate: 'skip' });
```

`validate: 'skip'` saves the document regardless of schema conformance. This is useful when the LLM's output might have minor deviations (empty strings, missing optional fields) that you want the user to review and correct before confirming.

---

## Documents as LLM Context

The document store is also the LLM's memory. When you call an LLM tool without an explicit prompt, it scans the document store for all `LlmMessageDocument` records in the current run and builds the conversation history automatically:

```typescript
// No prompt — LLM reads all LlmMessageDocument records as history
const result = await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
```

The LLM sees the messages in the order they were saved — user messages, assistant responses, tool calls, tool results. Adding a new user message to the document store before calling the LLM is how you extend the conversation:

```typescript
// Save user message → LLM will see it as the next turn
await this.documentStore.save(LlmMessageDocument, { role: 'user', content: userInput });

// LLM call includes all prior messages + the new user message
const result = await this.llmGenerateText.call({}, { config: { provider: 'claude' } });
```

This is why multi-turn chat works without manually managing a messages array. The document store is the messages array.

### Hidden Documents

Documents with `{ meta: { hidden: true } }` are saved to the database and visible to the LLM but not shown in the Studio UI:

```typescript
// System prompt — LLM reads it, users don't see it
await this.documentStore.save(
  LlmMessageDocument,
  { role: 'user', content: systemPromptText },
  { meta: { hidden: true } },
);
```

---

## Built-in Document Types

You don't always need to create custom documents. The built-in types cover the most common cases:

| Document             | Source                           | Use case                                                           |
| -------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `LlmMessageDocument` | `@loopstack/llm-provider-module` | Chat messages — user and assistant turns, tool calls, tool results |
| `MessageDocument`    | `@loopstack/common`              | Simple role/content messages without LLM-specific fields           |
| `MarkdownDocument`   | `@loopstack/common`              | Rich text output rendered as formatted markdown                    |
| `PlainDocument`      | `@loopstack/common`              | Plain text output                                                  |
| `LinkDocument`       | `@loopstack/common`              | Links to sub-workflow runs, with embed and status support          |
| `ErrorDocument`      | `@loopstack/common`              | Error messages, automatically saved on transition failure          |

Custom documents are for when you need structured forms, interactive fields, or action buttons — see the [Creating Documents](/docs/build/fundamentals/documents) guide.

---

## Next Steps

- [Creating Documents](/docs/build/fundamentals/documents) — custom schemas, YAML widgets, form actions
- [How the Workflow Engine Works](/docs/learn/workflow-engine) — how documents fit into the transaction and rollback model
- [Architecture Overview](/docs/learn/architecture) — where documents live in the broader system
