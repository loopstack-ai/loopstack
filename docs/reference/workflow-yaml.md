---
title: Workflow YAML Schema
description: Complete reference for workflow .ui.yaml files — title, description, widget layout, input forms, action buttons, and place-based widget gating with enabledWhen (disable) and showWhen (hide) for Loopstack Studio.
---

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
| `variant`    | `string` | Button variant (optional)                                 |
| `props`      | `object` | Additional properties (optional)                          |

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

- **Type:** `string[]` (optional)
- **Description:** Controls when a widget is interactive based on the current workflow place. Outside the listed places the widget is still rendered, but disabled.

```yaml
- widget: prompt-input
  enabledWhen:
    - waiting_for_user
  options:
    transition: userMessage
```

The input stays on screen at every place and accepts messages only while the workflow is at `waiting_for_user`.

### `showWhen`

- **Type:** `string[]` (optional)
- **Description:** Controls when a widget is visible based on the current workflow place. Unlike `enabledWhen` (which controls interactivity), `showWhen` hides the widget entirely when the workflow is not at one of the listed places.

```yaml
- widget: button
  showWhen:
    - awaiting_tools
  options:
    transition: cancelPendingTools
    label: Cancel pending tools
```

The button is only rendered while the workflow is at `awaiting_tools`.

When a widget sets both, `showWhen` is checked first: outside its places the widget is hidden, and inside them `enabledWhen` decides whether it is enabled. A widget with neither is shown at every place. In all cases a visible widget is also disabled while its `transition` is not currently available. A widget that declares no transition submits to the workflow's only available transition, and is disabled while two or more are available. Only enabled widgets can become the prompt Studio and the CLI ask — see [Prompt Selection Rules](./prompt-selection.md#widget-state).

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
