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

| Property      | Type       | Description                               |
| ------------- | ---------- | ----------------------------------------- |
| `widget`      | `string`   | Widget type (see below)                   |
| `title`       | `string`   | Display label                             |
| `placeholder` | `string`   | Placeholder text                          |
| `help`        | `string`   | Help text below the field                 |
| `rows`        | `number`   | Visible rows (for `textarea`)             |
| `readonly`    | `boolean`  | Make field read-only                      |
| `hidden`      | `boolean`  | Hide the field                            |
| `disabled`    | `boolean`  | Disable interaction                       |
| `collapsed`   | `boolean`  | Collapse arrays/objects by default        |
| `order`       | `string[]` | Display order of nested fields            |
| `enumOptions` | `array`    | Options for select/radio widgets          |
| `items`       | `object`   | UI config for array items                 |
| `properties`  | `object`   | UI config for nested object fields        |
| `addable`     | `boolean`  | Allow adding items (arrays)               |
| `removable`   | `boolean`  | Allow removing items (arrays)             |
| `movable`     | `boolean`  | Allow reordering items (arrays)           |
| `inputType`   | `string`   | HTML input type (e.g., `email`, `number`) |

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

Meta properties are set via the `options` parameter of `this.documentStore.save()`:

```typescript
await this.documentStore.save(MyDocument, content, {
  id: 'doc-1',
  meta: {
    hidden: true,
  },
});
```

| Property         | Type       | Description                           |
| ---------------- | ---------- | ------------------------------------- |
| `hidden`         | `boolean`  | Hide from the UI                      |
| `mimeType`       | `string`   | Content MIME type                     |
| `enableAtPlaces` | `string[]` | Places where the document is editable |
| `hideAtPlaces`   | `string[]` | Places where the document is hidden   |

### Supported MIME Types

`text/plain`, `text/html`, `text/markdown`, `application/json`, `application/javascript`, `application/typescript`, `application/yaml`

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
