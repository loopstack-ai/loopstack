---
'@loopstack/contracts': minor
'@loopstack/core': minor
'@loopstack/api': minor
---

Run tracing over the wire: `workflow.updated` events now carry the workflow's current `place`, so stream consumers can render step-level progress without a round-trip per transition, and `WorkflowFullSchema` exposes the run's published `result` (built via `assignResult`/`setResult`) through `GET /api/v1/workflows/:id`.
