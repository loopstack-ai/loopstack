---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/testing': minor
---

A sub-workflow's caller names one transition per outcome: `onSuccess` receives the child's result as a `TransitionInput`, `onFailure` receives a failed or canceled child as the new `FailureInput` with its `status` and `errorMessage`. `metadata` on `run()` is carried into both as `meta`.

Both are optional. With no `onFailure`, the parent is parked as failed at the place it waits at, with the child's error message, so the child keeps its Retry and a retried child that then succeeds still reaches `onSuccess`. With no `onSuccess`, nothing is called back.

`TransitionInput` carries `workflowId`, `data` and `meta`: a success callback and a user or API resume have no failure to report. `errorPlace` and `retryAttempts` apply to a transition whose own body throws.

`FanOutWorkflow` and `SequenceWorkflow` declare `recordChildResult` and `recordChildFailure`. `ToolCallOptions` carries `onSuccess`, `onFailure` and `metadata` for async tools to forward. The workflow row stores `onSuccessTransition` and `onFailureTransition`, and the API exposes both. `@loopstack/testing` adds `unhandledFailure()` beside `failure()`, for the path a parent with no `onFailure` takes.
