---
'@loopstack/loopstack-studio': patch
---

The run view draws a form as the document declared it.

The run view's `form` prompt walked the schema on its own and drew every string as a single-line input,
reading nothing of the declared widgets: a three-row textarea was one cut-off line, a collapsed Markdown block
was an input holding the whole block, an enum was free text. It now renders through the same dynamic form the
document tree uses, so a widget added there works in both views. It keeps its own actions and its own submit.

Two things came with it. A form action draws the variant it declares, `default` when none, instead of the
first action always being primary. And a refused submit names the field it failed on, as the document tree
already did, instead of a button that does nothing.
