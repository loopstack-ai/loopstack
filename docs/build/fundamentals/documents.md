---
title: Creating Documents
description: How to define typed document classes with @Document() decorator, Zod validation schemas, and YAML widget configs for rendering in Loopstack Studio.
---

# Creating Documents

Documents are typed data objects displayed in the Loopstack Studio UI. They have a Zod schema for validation and a YAML config for rendering.

## Basic Document

```typescript
import { z } from 'zod';
import { Document } from '@loopstack/common';

export const NotesSchema = z.object({
  text: z.string(),
});

@Document({
  schema: NotesSchema,
  widget: __dirname + '/notes.ui.yaml',
})
export class NotesDocument {
  text: string;
}
```

```yaml
# notes.ui.yaml
type: document
ui:
  widgets:
    - widget: form
      options:
        properties:
          text:
            title: Notes
            widget: textarea
            rows: 8
```

## The `@Document` Decorator

```typescript
@Document({
  schema: NotesSchema,
  widget: __dirname + '/notes.ui.yaml',
})
```

All options are optional.

| Option        | Type                       | Default                                                 | Description                                                                                                                                                                                                |
| ------------- | -------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `string`                   | class name with `Document` suffix stripped, snake_cased | Explicit snake_case identifier. E.g. `AskUserDocument` → `ask_user`, `LlmMessageDocument` → `llm_message`.                                                                                                 |
| `title`       | `string`                   | —                                                       | Human-readable display title shown in Studio UI.                                                                                                                                                           |
| `description` | `string`                   | —                                                       | Human-readable description shown in Studio UI.                                                                                                                                                             |
| `widget`      | `WidgetRef \| WidgetRef[]` | —                                                       | Path(s) to YAML file(s) — or inline widget object(s) — defining how the document renders in Studio.                                                                                                        |
| `schema`      | `z.ZodType`                | —                                                       | Zod schema validating document content on `documentStore.save()`.                                                                                                                                          |
| `tags`        | `string[]`                 | —                                                       | Default tags assigned to every instance of this document. Useful for filtering and querying.                                                                                                               |
| `meta`        | `StaticDocumentMeta`       | —                                                       | Static document metadata — served via the config endpoint, not persisted per instance.                                                                                                                     |
| `internal`    | `boolean`                  | `false`                                                 | When `true`, instances are persisted server-side (still readable by LLM providers) but excluded from API responses and live updates — Studio never sees them. Use for framework plumbing like LLM context. |

> **Documents are plain DTOs, not NestJS providers.** Unlike `@Tool` and `@Workflow`, `@Document` does **not** apply `@Injectable()`. Don't add document classes to a module's `providers` array and don't try to inject them — reference the class directly when calling `documentStore.save(MyDocument, ...)`.

## Saving Documents

Use `this.documentStore.save()` inside workflow transition methods. Reference document classes directly — no injection needed. `documentStore` is auto-injected on `BaseWorkflow` and `BaseTool`.

```typescript
// Create a new document
await this.documentStore.save(NotesDocument, { text: 'Hello!' });

// Create/update with a specific key (upsert — invalidates the previous version)
await this.documentStore.save(NotesDocument, { text: 'Updated content' }, { key: 'notes-1' });

// With meta options (free-form extension data on the document row)
await this.documentStore.save(NotesDocument, { text: 'Tagged note' }, { meta: { source: 'import' } });
```

### Saving an Instance

`save()` is overloaded — instead of passing class + data, you can `create()` an instance, mutate it, then save it. Useful when you need to build up a document across several steps before persisting.

```typescript
const draft = this.documentStore.create(NotesDocument, { text: 'Initial draft' });
draft.text += '\n\nAddendum.';
await this.documentStore.save(draft);

// With save options
await this.documentStore.save(draft, { key: 'notes-1' });
```

`create()` returns a class instance (typed as `NotesDocument`) populated with the data; it does not persist anything. Persistence only happens on `save()`.

### Save Options

| Option            | Type                           | Description                                                                                                                                                                                      |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `key`             | `string`                       | Stable upsert key — saving twice with the same `key` invalidates the previous row in place. Use for documents that update over time (status tickers, form state, transcripts).                   |
| `validate`        | `'strict' \| 'safe' \| 'skip'` | Validation mode. Default `'strict'` — throws on invalid content. `'safe'` stores partial data + error. `'skip'` bypasses validation. See [Validation](../../learn/document-store.md#validation). |
| `meta`            | `Record<string, unknown>`      | Free-form extension data persisted on the document row. Use for ad-hoc payload that downstream readers need. For framework concerns (hide from UI, etc.), use decorator options instead.         |
| `meta.invalidate` | `boolean`                      | When `false`, prevents the previous version with the same `key` from being invalidated. Default behavior replaces the old version.                                                               |

## Querying Documents

`documentStore` exposes three read methods. All of them return only **non-invalidated** documents for the current workflow run — invalidated revisions are filtered out automatically.

| Method                | Returns            | When to use                                                          |
| --------------------- | ------------------ | -------------------------------------------------------------------- |
| `findAll(MyDocument)` | `MyDocument[]`     | All documents of one type, **hydrated as typed instances**.          |
| `findByTag('tag')`    | `DocumentEntity[]` | Documents tagged with that tag (across types). Returns raw entities. |
| `findAllDocuments()`  | `DocumentEntity[]` | Everything in the run — useful for LLM tools, history scans.         |

```typescript
// Typed, type-safe — preferred
const notes = this.documentStore.findAll(NotesDocument);
notes.forEach((n) => console.log(n.text));

// By tag — across document types
const messages = this.documentStore.findByTag('message');

// All documents in this run (raw entities)
const all = this.documentStore.findAllDocuments();
```

`findAll` re-validates and hydrates entities back into class instances (via `plainToInstance`). `findByTag` and `findAllDocuments` return raw `DocumentEntity` objects — use `entity.content` for the persisted data and `entity.documentName` to discriminate types.

> Need a typed instance without persisting? Use [`documentStore.create(MyDocument, data)`](#saving-an-instance) — it validates against the Zod schema and returns a class instance with no DB write.

## Built-in Document Types

These are available without creating custom documents:

| Document             | Source                           | Key Fields                                 |
| -------------------- | -------------------------------- | ------------------------------------------ |
| `LlmMessageDocument` | `@loopstack/llm-provider-module` | `role`, `text`, `blocks`                   |
| `LlmContextDocument` | `@loopstack/llm-provider-module` | `role`, `text`                             |
| `LinkDocument`       | `@loopstack/common`              | `label`, `workflowId`, `embed`, `expanded` |
| `MessageDocument`    | `@loopstack/common`              | `role`, `text`                             |
| `MarkdownDocument`   | `@loopstack/common`              | `markdown`                                 |
| `PlainDocument`      | `@loopstack/common`              | `text`                                     |
| `ErrorDocument`      | `@loopstack/common`              | `error`                                    |

### Choosing the right built-in type

- **`LlmMessageDocument`** — visible assistant/user conversation turns. Extends `MessageDocument` with structured `blocks` (tool calls, thinking, tool results) and an LLM `stopReason`. Tagged `'message'`, so it's automatically collected into LLM conversation history. The LLM provider tools save these for you in normal use.
- **`LlmContextDocument`** — hidden conversation context. Declared `@Document({ internal: true, tags: ['message'] })`. The LLM provider picks these up as conversation history just like `LlmMessageDocument`, but Studio doesn't show them. Use to seed system prompts, prior steps, or background info without polluting the user-facing chat.
- **`MessageDocument`** — plain `{ role, text }` UI bubbles for non-LLM flows (status updates, narrative output, logging a `system` note). Tagged `'ui-message'` — **not** collected into LLM history. Use this when you want a chat-style message in Studio without polluting the LLM's context.
- **`MarkdownDocument`** — formatted prose, headings, lists, links. Use when you want Studio to render rich text.
- **`PlainDocument`** — unformatted text output: raw command output, log dumps, plain blob. Use when Markdown rendering would interpret characters you want shown literally.
- **`LinkDocument`** — links to other workflow runs (sub-workflows, related runs). Studio renders these as cards with a live status indicator derived from the linked workflow's state. The orchestrator saves one automatically when you call `subWorkflow.run()` (see [Sub-Workflows](../patterns/sub-workflows.md)); save manually only if you need a link card outside the standard sub-workflow flow.
- **`ErrorDocument`** — engine-managed; do not construct manually. Written automatically when a transition fails (see [Workflow Engine — ErrorDocument](../../learn/workflow-engine.md#errordocument)).

```typescript
import { LinkDocument, MarkdownDocument, PlainDocument } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider-module';

await this.documentStore.save(LlmMessageDocument, {
  role: 'assistant',
  text: 'Hello! How can I help?',
});

await this.documentStore.save(MarkdownDocument, {
  markdown: '# Report\n- Item 1\n- Item 2',
});

// Raw command output — keep characters literal
await this.documentStore.save(PlainDocument, { text: shellOutput });
```

## YAML UI Configuration

### Form Widget

The `form` widget renders document fields as an editable form:

```yaml
type: document
ui:
  widgets:
    - widget: form
      options:
        order: [name, description, items]
        properties:
          name:
            title: Name
          description:
            title: Description
            widget: textarea
          items:
            title: Items
            collapsed: true
            items:
              title: Item
        actions:
          - type: button
            transition: submit
            label: 'Submit'
```

### Available Widget Types

Use these in `options.properties.<field>.widget`:

| Widget      | Description                          |
| ----------- | ------------------------------------ |
| `text`      | Single-line text input (default)     |
| `textarea`  | Multi-line text area                 |
| `select`    | Dropdown select                      |
| `radio`     | Radio button group                   |
| `checkbox`  | Checkbox                             |
| `switch`    | Toggle switch                        |
| `slider`    | Numeric slider                       |
| `code-view` | Code editor with syntax highlighting |

### Property Options

| Option        | Type      | Description                        |
| ------------- | --------- | ---------------------------------- |
| `title`       | `string`  | Display label                      |
| `widget`      | `string`  | Widget type                        |
| `placeholder` | `string`  | Placeholder text                   |
| `rows`        | `number`  | Visible rows (textarea)            |
| `readonly`    | `boolean` | Read-only field                    |
| `hidden`      | `boolean` | Hide the field                     |
| `disabled`    | `boolean` | Disable interaction                |
| `collapsed`   | `boolean` | Collapse arrays/objects by default |
| `items`       | `object`  | UI config for array items          |

### Document Actions

Buttons that trigger `wait: true` transitions in the workflow:

```yaml
actions:
  - type: button
    transition: confirm # Must match the method name
    label: 'Confirm'
```

### Tags

Tags categorize documents for filtering and searching. There are two ways to set them:

**Decorator default tags** — written to every instance, persisted on each row, queryable via `findByTag()`:

```typescript
@Document({
  schema: NotesSchema,
  widget: __dirname + '/notes.ui.yaml',
  tags: ['message', 'important'],
})
export class NotesDocument {
  /* ... */
}
```

**YAML config tags** — static metadata served via the config endpoint, used by Studio and LLM tools for grouping/filtering, not persisted on individual rows:

```yaml
type: document
tags:
  - message
  - important
```

Decorator tags are the right choice for runtime querying — every saved instance carries them, and `this.documentStore.findByTag('message')` returns them. YAML tags are for static document-type metadata. Tags from both sources are also used by LLM tools with `messagesSearchTag` config to collect documents as conversation history.

## Structured Output Example

Documents work with `LlmGenerateObjectTool` for AI-generated structured data:

```typescript
export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

@Document({
  schema: FileDocumentSchema,
  widget: __dirname + '/file-document.yaml',
})
export class FileDocument {
  filename: string;
  description: string;
  code: string;
}
```

```yaml
# file-document.yaml
type: document
ui:
  widgets:
    - widget: form
      options:
        order: [filename, description, code]
        properties:
          filename:
            title: File Name
            readonly: true
          description:
            title: Description
            readonly: true
          code:
            title: Code
            widget: code-view
```

Used in a workflow:

```typescript
const result = await this.llmGenerateObject.call(
  {
    outputSchema: toJSONSchema(FileDocumentSchema) as Record<string, unknown>,
    prompt: 'Generate a Hello World script in Python',
  },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);
```

## Registry References

- [prompt-structured-output-example-workflow](https://loopstack.ai/registry/loopstack-prompt-structured-output-example-workflow) — FileDocument with code-view widget for AI-generated code
- [meeting-notes-example-workflow](https://loopstack.ai/registry/loopstack-meeting-notes-example-workflow) — MeetingNotesDocument and OptimizedNotesDocument with form widgets and action buttons
- [test-ui-documents-example-workflow](https://loopstack.ai/registry/loopstack-test-ui-documents-example-workflow) — Demonstrates all core UI document types: MessageDocument, ErrorDocument, MarkdownDocument, PlainDocument

---

> **Using an AI coding agent?** See [Skill: Create a Custom Document](../../skills/create-custom-document.md) for a dense checklist and syntax reference optimized for code generation.
