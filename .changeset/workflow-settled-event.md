---
'@loopstack/core': minor
---

A `workflow.settled` event announces a run that reached a terminal state.

- `WORKFLOW_SETTLED` and `WorkflowSettledEvent` (`{ id, workspaceId, workflowName, parentId?, status, user }`) are
  exported from `@loopstack/core`. The event is emitted for completed, failed and canceled runs, sub-workflows
  included, so a host application can release what it held for a run — a claimed resource, a reserved slot — without
  polling. The counterpart of `workspace.deleted` / `workflow.deleted`, for the end of a run rather than the end of
  its record.
- Emitted from `WorkflowOrchestrationService.complete()`, which every settling path already calls, before the return
  for a run with no parent callback. A listener that throws is logged and does not take the parent's callback with it.
- Consumers must be idempotent: the event is not guaranteed exactly once per run, and a process that dies before its
  listener ran never sees it. Anything whose correctness depends on it should reconcile against the run's status and
  treat the event as what makes that prompt.
- `WorkflowOrchestrationService.cancel()` calls `complete()` unconditionally; the guard it repeated lives in
  `complete()` itself.
