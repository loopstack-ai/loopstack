---
title: 'Skill: Create a Custom Document'
description: Step-by-step instructions for AI agents to scaffold a new document — @Document decorator, Zod schema, YAML widget config, and how to save instances via documentStore.
---

# Skill: Create a Custom Document

> **For AI coding agents:** This page is a dense reference checklist optimized for tools like Claude Code scaffolding Loopstack code. For the human-readable guide, see [Creating Documents](../build/fundamentals/documents.md).

## Document Anatomy

A document is a **plain TypeScript DTO** decorated with `@Document()`. It pairs a Zod schema (for content validation) with an optional YAML widget config (for Studio rendering).

```typescript
import { z } from 'zod';
import { Document } from '@loopstack/common';

export const NotesSchema = z.object({
  text: z.string(),
});

@Document({
  schema: NotesSchema,
  widget: './notes.ui.yaml',
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

> **Documents are NOT NestJS providers.** Unlike `@Tool` and `@Workflow`, `@Document` does not apply `@Injectable()`. Do **not** add document classes to a module's `providers` array. Do **not** inject them. Reference the class directly: `documentStore.save(NotesDocument, …)`.

## `@Document()` Options

All options are optional.

| Option        | Type                       | Default                                                 | Description                                                                         |
| ------------- | -------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `name`        | `string`                   | class name with `Document` suffix stripped, snake_cased | Explicit snake_case identifier. E.g. `AskUserDocument` → `ask_user`.                |
| `title`       | `string`                   | —                                                       | Display title shown in Studio.                                                      |
| `description` | `string`                   | —                                                       | Description shown in Studio.                                                        |
| `widget`      | `WidgetRef \| WidgetRef[]` | —                                                       | YAML file path(s) — or inline widget object(s) — defining how the document renders. |
| `schema`      | `z.ZodType`                | —                                                       | Zod schema validating document content on `documentStore.save()`.                   |
| `tags`        | `string[]`                 | —                                                       | Default tags assigned to every instance.                                            |
| `meta`        | `StaticDocumentMeta`       | —                                                       | Static metadata served via the config endpoint, not persisted per instance.         |

## Saving Documents

`documentStore` is auto-injected on `BaseWorkflow` and `BaseTool`. Reference document classes directly — no injection.

```typescript
// Create a new document
await this.documentStore.save(NotesDocument, { text: 'Hello!' });

// Create or update with a specific key (upsert in place — invalidates the previous version)
await this.documentStore.save(NotesDocument, { text: 'Updated' }, { key: 'notes-1' });
```

To hide a document type from the UI entirely, declare `internal: true` on its decorator (`@Document({ internal: true, ... })`) rather than passing a per-save flag. Internal documents are persisted and still readable server-side (e.g. by LLM providers), but never reach Studio.

### Save an instance instead

```typescript
const draft = this.documentStore.create(NotesDocument, { text: 'Initial' });
draft.text += '\n\nMore.';
await this.documentStore.save(draft); // overload: pre-built instance
await this.documentStore.save(draft, { key: 'notes-1' }); // with save options
```

`create()` returns a typed class instance with the data attached. Nothing is persisted until `save()`.

### Save Options

| Option     | Type                           | Description                                                                                           |
| ---------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `key`      | `string`                       | Stable upsert key — passing the same `key` twice replaces the previous row in place.                  |
| `validate` | `'strict' \| 'safe' \| 'skip'` | Schema validation mode. Default `'strict'`.                                                           |
| `meta`     | `Record<string, unknown>`      | Free-form extension data persisted on the row. For framework concerns, use decorator options instead. |

## Querying Documents

All methods return only non-invalidated documents for the current run.

| Method                | Returns            | Use for                                         |
| --------------------- | ------------------ | ----------------------------------------------- |
| `findAll(MyDocument)` | `MyDocument[]`     | Typed hydrated instances of one document type.  |
| `findByTag('tag')`    | `DocumentEntity[]` | All documents tagged with `tag` (across types). |
| `findAllDocuments()`  | `DocumentEntity[]` | Every document in this run, raw entities.       |

```typescript
const notes = this.documentStore.findAll(NotesDocument); // typed
const tagged = this.documentStore.findByTag('message');
const all = this.documentStore.findAllDocuments();
```

`documentStore.create(MyDocument, data)` returns a typed instance **without** persisting — validates against the Zod schema only.

## Reusing Built-in Documents

Don't redefine these — import and save:

| Document             | Source                           | Key fields                                 |
| -------------------- | -------------------------------- | ------------------------------------------ |
| `LlmMessageDocument` | `@loopstack/llm-provider-module` | `role`, `text`, `blocks`                   |
| `LinkDocument`       | `@loopstack/common`              | `label`, `workflowId`, `embed`, `expanded` |
| `MessageDocument`    | `@loopstack/common`              | `role`, `text`                             |
| `MarkdownDocument`   | `@loopstack/common`              | `markdown`                                 |
| `PlainDocument`      | `@loopstack/common`              | `text`                                     |
| `ErrorDocument`      | `@loopstack/common`              | `error`                                    |

```typescript
import { MarkdownDocument } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider-module';

await this.documentStore.save(LlmMessageDocument, { role: 'assistant', text: 'Hello!' });
await this.documentStore.save(MarkdownDocument, { markdown: '# Report\n- A\n- B' });
```

## YAML Widget Config

The `widget` option points to a YAML file describing how the document renders in Studio. The most common widget is `form`:

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

### Widget Types

Used in `options.properties.<field>.widget`:

| Widget      | Description                       |
| ----------- | --------------------------------- |
| `text`      | Single-line text (default)        |
| `textarea`  | Multi-line text                   |
| `select`    | Dropdown                          |
| `radio`     | Radio buttons                     |
| `checkbox`  | Checkbox                          |
| `switch`    | Toggle                            |
| `slider`    | Numeric slider                    |
| `code-view` | Syntax-highlighted read-only code |

### Property Options

| Option        | Type      | Description                        |
| ------------- | --------- | ---------------------------------- |
| `title`       | `string`  | Display label                      |
| `widget`      | `string`  | Widget type (see above)            |
| `placeholder` | `string`  | Placeholder text                   |
| `rows`        | `number`  | Visible rows (textarea)            |
| `readonly`    | `boolean` | Read-only field (server-enforced)  |
| `hidden`      | `boolean` | Hide the field                     |
| `disabled`    | `boolean` | Disable interaction                |
| `collapsed`   | `boolean` | Collapse arrays/objects by default |
| `items`       | `object`  | UI config for array items          |

#### Read-only fields

`readonly: true` is enforced, not just rendered: Studio shows the field as non-editable, the CLI discards `$EDITOR` changes to it, and the **backend rejects** any transition submission that changes the field's value relative to the active document's content (`400 — Field "subject" of document "feedback_form" is read-only.`). Use it for workflow-provided values the user must see but not alter:

```yaml
properties:
  subject:
    title: Subject
    readonly: true
```

Enforcement applies to user submissions of transitions the widget declares (`actions[].transition` / `options.transition`); the workflow itself can always update its own documents. See `inline_form_example` in `@loopstack/hitl-examples` for a working example.

### Actions

Buttons that trigger `wait: true` transitions:

```yaml
actions:
  - type: button
    transition: confirm # must match the transition method name
    label: Confirm
```

## Checklist

1. Decide if a built-in document covers your need first — don't reinvent `MessageDocument`, `MarkdownDocument`, etc.
2. Create the class file with `@Document({ schema, widget })`.
3. Define the Zod schema next to or above the class.
4. Add the YAML widget config beside the `.ts` file (e.g. `notes.ui.yaml`).
5. **Do not** add the class to module `providers`. Reference it directly via `documentStore.save(MyDocument, …)`.
6. Save via `documentStore.save(MyDocument, content, options?)` from a workflow transition or tool.
