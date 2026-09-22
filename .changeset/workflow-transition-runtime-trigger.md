---
'@loopstack/contracts': patch
---

`WorkflowTransitionSchema` now describes the `trigger` the engine actually serializes:
`WorkflowTransitionType['trigger']` is `'manual'` or absent, matching every producer of
`WorkflowInterface.availableTransitions`. `'onEntry'` belongs to the declared graph alone, so
`WorkflowTransitionDefinitionSchema` — the shape the config endpoint serves — restates `trigger`
at the wider `'manual' | 'onEntry'` enum alongside the guard name.
