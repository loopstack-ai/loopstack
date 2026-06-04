# Workflow YAML Schema

## Top-Level Properties

### `title`

- **Type:** `string`
- **Description:** Display name shown in the Studio UI.

```yaml
title: 'Meeting Notes Optimizer'
```

### `description` (optional)

- **Type:** `string`
- **Description:** Detailed explanation of the workflow's purpose.

```yaml
description: 'Transforms messy meeting notes into structured format using AI'
```

### `ui` (optional)

- **Type:** UI Schema object
- **Description:** Defines widgets rendered in the Studio interface.

## UI Widgets

The `ui.widgets` array defines the interactive components shown to the user.

### Form Widget

Renders workflow input fields as an editable form with optional action buttons.

```yaml
ui:
  widgets:
    - widget: form
      enabledWhen: [waiting]
      options:
        order: [name, description]
        properties:
          name:
            title: Name
          description:
            title: Description
            widget: textarea
        actions:
          - type: button
            transition: submit
            label: 'Submit'
```

#### Form Options

| Property     | Type       | Description                            |
| ------------ | ---------- | -------------------------------------- |
| `order`      | `string[]` | Display order of fields                |
| `properties` | `object`   | Map of field names to UI configuration |
| `actions`    | `array`    | Action buttons                         |

#### Action Properties

| Property     | Type     | Description                                               |
| ------------ | -------- | --------------------------------------------------------- |
| `type`       | `string` | Action type (e.g., `button`)                              |
| `transition` | `string` | **Method name** of the `wait: true` transition to trigger |
| `label`      | `string` | Button label text                                         |
| `position`   | `number` | Button position order (optional)                          |

### Prompt-Input Widget

Chat-style text input field.

```yaml
ui:
  widgets:
    - widget: prompt-input
      enabledWhen: [waiting_for_user]
      options:
        transition: userMessage
        label: Send Message
```

| Property     | Type     | Description                                               |
| ------------ | -------- | --------------------------------------------------------- |
| `transition` | `string` | **Method name** of the `wait: true` transition to trigger |
| `label`      | `string` | Input label text (optional)                               |

### `enabledWhen`

Controls when a widget is visible based on the current workflow place:

```yaml
- widget: form
  enabledWhen:
    - waiting
    - editing
```

The widget is only shown when the workflow is at one of the listed places.

## Complete Example

```yaml
title: 'Chat Assistant'
description: 'Multi-turn chat with AI'

ui:
  widgets:
    - widget: form
      options:
        properties:
          subject:
            title: Subject
            widget: select
            enumOptions:
              - coffee
              - programming
              - nature
    - widget: prompt-input
      enabledWhen:
        - waiting_for_user
      options:
        transition: userMessage
        label: Send a message
```

## Important Notes

- The `transition` value must match the **method name** of a `wait: true` transition, not an arbitrary ID
- If no `ui` section is defined, the workflow runs without any interactive widgets
