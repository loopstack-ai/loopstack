---
'@loopstack/loopstack-studio': minor
---

Render a workspace **home** page from an app's `ui.widgets`: each `start-form` widget becomes a launch card with the referenced workflow's args form and a configurable button label, and more than one card can be stacked (e.g. a "Provision Base" card beside a "Run the engineer" card). Inputs also honor a schema-embedded widget hint (Zod `.meta({ widget: 'textarea' })`), so a workflow can request a multi-line prompt field without a separate `ui` config.
