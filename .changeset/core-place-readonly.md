---
'@loopstack/contracts': minor
'@loopstack/api': minor
'@loopstack/core': patch
---

- **`readonly` form fields are enforced** (api): transition submissions through the API are validated against the active prompt document — changing a field marked `readonly: true` (widget config `options.properties`, schema fallback, Studio's own resolution rule) is rejected with 400 naming the field. Scoped to transitions the document's widget declares; internal transitions (sub-workflow callbacks) are unaffected.
- **`DocumentFilterSchema` gains `place`** (contracts): documents are filterable by the place they were saved in — the server-side backbone for Studio-parity prompt discovery.
- **UUID path params are validated** (api): malformed ids on workflow/document/workspace/processor endpoints return 400 instead of 500.
- **`workflow.created` is dispatched for root workflows too** (core): clients following a run see sub-workflows join the tree reliably, including when creation happens outside the standard orchestration path.
