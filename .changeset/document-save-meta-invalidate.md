---
'@loopstack/common': patch
---

`meta` on `DocumentSaveOptions` and on a tool's `ToolDocumentDeclaration` options is typed as `DynamicDocumentMeta & Record<string, unknown>`, so `invalidate` is visible at the call site. `meta: { invalidate: false }` keeps the revision it is saved with live when a later save reuses its `key`. Other keys stay free-form. A declared document whose `meta.invalidate` is not a boolean now fails the tool call.
