---
'@loopstack/contracts': minor
'@loopstack/api': minor
'@loopstack/common': minor
'@loopstack/core': minor
---

Make the workflows/documents/processor REST surface zod-first. `@loopstack/contracts/api` now defines zod schemas (with the existing `*Interface` names as inferred types) for workflow item/full/status/create/update/filter, documents, checkpoints, processor payloads, batch delete, and paginated lists. The api package validates request bodies and JSON query params with `ZodValidationPipe`/`ZodJsonQueryPipe`, restricts sort fields to real entity columns, and builds responses through explicit mapper functions that are schema-validated outside production — replacing the class-validator/class-transformer DTOs for these controllers, which are removed. Wire-truth fixes along the way: workflow `title` is typed nullable, document timestamps are ISO strings, `validationError` is now actually serialized, checkpoints are typed, and run-payload transitions accept an omitted `id`. `WorkflowRunResult` lives in contracts and is re-exported by `@loopstack/common`.
