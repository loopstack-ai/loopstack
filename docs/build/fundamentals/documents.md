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
  schema: NotesSchema,                      // Zod schema for validation
  widget: __dirname + '/notes.ui.yaml',     // Path to UI YAML config
})
```

- **`schema`** — Zod schema that validates document content
- **`widget`** — Path to YAML file defining how the document renders in the UI

## Saving Documents

Use `this.documentStore.save()` inside workflow transition methods. Reference document classes directly — no injection needed. `documentStore` is auto-injected on `BaseWorkflow` and `BaseTool`.

```typescript
// Create a new document
await this.documentStore.save(NotesDocument, { text: 'Hello!' });

// Create/update with a specific ID
await this.documentStore.save(NotesDocument, { text: 'Updated content' }, { id: 'notes-1' });

// With meta options
await this.documentStore.save(NotesDocument, { text: 'Hidden note' }, { id: 'hidden', meta: { hidden: true } });
```

### Save Options

| Option        | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| `id`          | `string`  | Custom ID — use for updating existing documents |
| `meta.hidden` | `boolean` | Hide from the UI                                |

## Built-in Document Types

These are available without creating custom documents:

| Document             | Source                           | Key Fields                                           |
| -------------------- | -------------------------------- | ---------------------------------------------------- |
| `LlmMessageDocument` | `@loopstack/llm-provider-module` | `role`, `content`                                    |
| `LinkDocument`       | `@loopstack/common`              | `label`, `workflowId`, `status`, `embed`, `expanded` |
| `MessageDocument`    | `@loopstack/common`              | `role`, `content`                                    |
| `MarkdownDocument`   | `@loopstack/common`              | `markdown`                                           |
| `PlainDocument`      | `@loopstack/common`              | `text`                                               |
| `ErrorDocument`      | `@loopstack/common`              | `error`                                              |

```typescript
import { LinkDocument, MarkdownDocument } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider-module';

await this.documentStore.save(LlmMessageDocument, {
  role: 'assistant',
  content: 'Hello! How can I help?',
});

await this.documentStore.save(MarkdownDocument, {
  markdown: '# Report\n- Item 1\n- Item 2',
});
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

Categorize documents for filtering and searching:

```yaml
type: document
tags:
  - message
  - important
```

Tags are used by LLM tools with `messagesSearchTag` config to collect documents as conversation history.

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
