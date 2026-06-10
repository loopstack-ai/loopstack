---
title: Document YAML Schema
description: Complete reference for document .ui.yaml files — type, description, display components, and rendering configuration for Loopstack Studio.
---

# Document YAML Schema

Document YAML files define how documents are rendered in the Loopstack Studio interface.

## Top-Level Properties

### `type` (optional)

```yaml
type: document
```

Identifies this configuration as a document. Default: `document`.

### `description` (optional)

```yaml
description: 'Contains structured meeting notes with action items'
```

### `tags` (optional)

Labels for categorizing and filtering documents:

```yaml
tags:
  - meeting-notes
  - processed
```

### `ui`

Defines how the document renders in the UI.

## UI Widgets

### Form Widget

```yaml
ui:
  widgets:
    - widget: form
      options:
        order: [date, summary, participants, actionItems]
        properties:
          date:
            title: Date
          summary:
            title: Summary
            widget: textarea
          participants:
            title: Participants
            collapsed: true
            items:
              title: Participant
          actionItems:
            title: Action Items
            collapsed: true
            items:
              title: Action Item
        actions:
          - type: button
            transition: confirm
            label: 'Confirm'
```

### Form Field Properties

| Property      | Type       | Description                        |
| ------------- | ---------- | ---------------------------------- |
| `widget`      | `string`   | Widget type (see below)            |
| `label`       | `string`   | Field label                        |
| `title`       | `string`   | Section title                      |
| `description` | `string`   | Field description                  |
| `placeholder` | `string`   | Placeholder text                   |
| `help`        | `string`   | Help text below the field          |
| `rows`        | `number`   | Visible rows (for `textarea`)      |
| `inline`      | `boolean`  | Display field inline               |
| `readonly`    | `boolean`  | Make field read-only               |
| `hidden`      | `boolean`  | Hide the field                     |
| `disabled`    | `boolean`  | Disable interaction                |
| `collapsed`   | `boolean`  | Collapse arrays/objects by default |
| `fixed`       | `boolean`  | Fixed field                        |
| `order`       | `string[]` | Display order of nested fields     |
| `enumOptions` | `array`    | Options for select/radio widgets   |
| `items`       | `object`   | UI config for array items          |
| `properties`  | `object`   | UI config for nested object fields |

### Widget Types

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

### `enumOptions`

For `select` and `radio` widgets:

```yaml
language:
  title: Language
  widget: select
  enumOptions:
    - label: Python
      value: python
    - label: JavaScript
      value: javascript
```

Or as simple strings:

```yaml
enumOptions:
  - python
  - javascript
  - java
```

### Actions

Buttons that trigger `wait: true` transitions:

```yaml
actions:
  - type: button
    transition: confirm # Must match the method name
    label: 'Confirm'
  - type: button
    transition: reject
    label: 'Reject'
```

## Meta Properties

Loopstack splits document metadata into two kinds: **static meta** (declared once on `@Document({ meta })` and applied to every instance) and **dynamic meta** (passed per-call via `documentStore.save(…, { meta })` and persisted on that specific document row).

### Static Meta — `@Document({ meta })`

Declared on the decorator. Applies to every instance of this document type.

```typescript
@Document({
  schema: ReportSchema,
  meta: { hidden: false, mimeType: 'text/markdown', level: 'info' },
})
export class ReportDocument {
  /* ... */
}
```

| Property         | Type                                        | Description                                                                     |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| `hidden`         | `boolean`                                   | Hide every instance of this document type from the Studio UI by default.        |
| `mimeType`       | `string`                                    | MIME type hint used by Studio for rendering/downloads (see below for the list). |
| `level`          | `'debug' \| 'info' \| 'warning' \| 'error'` | Severity tag. Studio may style documents based on this.                         |
| `enableAtPlaces` | `string[]`                                  | Only render this document type when the workflow is at one of these places.     |
| `hideAtPlaces`   | `string[]`                                  | Hide this document type when the workflow is at one of these places.            |

### Dynamic Meta — `documentStore.save(…, { meta })`

Set per call. Persisted on the specific document row.

```typescript
await this.documentStore.save(MyDocument, content, { id: 'doc-1', meta: { hidden: true, invalidate: false } });
```

| Property              | Type      | Description                                                                                                                                             |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalidate`          | `boolean` | **Opt-out of replacement.** Default behavior (omitted/`true`) invalidates the previous version when reusing the same `id`. Set to `false` to keep both. |
| `data`                | `any`     | Arbitrary per-instance metadata bag for user-defined data. Not used by the framework.                                                                   |
| `streaming`           | `boolean` | _Frontend-managed._ Set by Studio during LLM streaming to indicate this document is still being filled in. Not typically set by backend code.           |
| `streamReadyForFinal` | `boolean` | _Frontend-managed._ Companion to `streaming` — marks the stream complete and the final version ready to persist. Not typically set by backend code.     |

> `hidden` also appears in `DocumentSaveOptions.meta` and overrides the static `hidden` value for this single row — handy when most rows should be visible but a specific one should be tucked away.

### Supported MIME Types

`text/plain`, `text/html`, `text/markdown`, `text/css`, `text/xml`, `application/json`, `application/javascript`, `application/typescript`, `application/yaml`, `application/xml`

## Complete Example

```yaml
type: document
description: 'Generated code file'
tags:
  - code
  - generated
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
            widget: textarea
          code:
            title: Code
            widget: code-view
        actions:
          - type: button
            transition: confirm
            label: 'Accept'
```
