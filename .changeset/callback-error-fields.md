---
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/run-sub-workflow-example': minor
---

`CallbackSchema` exposes `hasError: boolean` and `errorMessage: string | null` so a parent workflow can branch on a child's failure without parsing `status` strings or querying the child entity. The orchestrator populates both fields from the terminating child when it dispatches the parent's callback. The framework no longer auto-saves an `ErrorDocument` on caught transition exceptions — those failures surface via the workflow's own `errorMessage` field and the Retry affordance, so the document stream only contains errors explicitly recorded by user workflows. `@loopstack/run-sub-workflow-example` adds a `FailingSubWorkflow`, an `ErrorHandlingWorkflow` that exercises the error UI in both `show: 'inline'` and `show: 'link'` modes, and a `ShowModesWorkflow` that chains all three render modes (`inline → link → hidden`) in one flow.
