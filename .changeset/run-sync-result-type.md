---
'@loopstack/core': patch
---

`WorkflowRunner.runSync()` returns a type that follows the `stateless` option. Without `stateless`, the call resolves to a `SyncRunResult`, so `workflowId`, `workspaceId`, `status` and `result` can be read without a cast. With `stateless: true`, it resolves to a `StatelessRunResult`. Options whose `stateless` is only known as a `boolean` still resolve to the union of both.
