---
'@loopstack/contracts': patch
'@loopstack/common': patch
---

`WorkflowTransitionType` now describes only what the engine serializes at runtime:
`{ id, from, to, trigger? }`. The guard name moves to the new
`WorkflowTransitionDefinitionSchema` / `WorkflowTransitionDefinitionType`, the shape the
config endpoint serves — `WorkflowConfigDto.transitions` and the return type of
`buildWorkflowTransitions` — where the declared edge is drawn whether or not its guard can
fire. `WorkflowTransitionSchema` is `.strict()`, so anything validating a config-endpoint
transition list must use the definition schema.
