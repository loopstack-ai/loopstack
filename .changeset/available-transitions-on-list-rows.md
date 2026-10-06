---
'@loopstack/contracts': minor
'@loopstack/api': minor
---

Every run row says which transitions it is holding, and which of them await a payload.

`WorkflowItemInterface` gains `availableTransitions`, each entry marked `trigger: 'manual'` when the
transition was declared `wait: true`. It is what separates a run parked on a **person** from one parked on
machinery: `waiting` says only "stopped, not finished", and the engine assigns it to a human gate, a pending
child callback and a retry signal alike. The field was already on the single-run read and is a column the
list query loads anyway; a list is simply where a view asks that question about many runs at once.
