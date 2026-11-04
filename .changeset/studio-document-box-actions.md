---
'@loopstack/loopstack-studio': minor
---

Document boxes have the same smaller padding on all four sides and no label or time line above them. When the pointer is over a box, two icons show in its top-right corner: one copies the content (the markdown or message text, or the content as JSON for other documents), and one opens the document's metadata — type, name, role, created and updated time, place, transition, index, labels, tags, invalidation, validation error and the document, workflow and workspace IDs. The icons are on the boxes of the classic thread and of the run view.

The first and last block of rendered markdown no longer add a margin at the edge of the box.

`CompletionMessagePaper` takes the `document` it shows and an optional `copyText`; it has no `timestamp` or `metadata` prop.
