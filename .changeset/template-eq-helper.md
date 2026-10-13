---
'@loopstack/core': patch
---

`this.render()` templates can branch on a value with the `eq` helper: `{{#if (eq outcome "approved")}}…{{/if}}`. Templates are compiled in the framework's own Handlebars environment, so the helper does not reach an application's other Handlebars use.
