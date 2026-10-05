---
'@loopstack/error-handling-examples': patch
'@loopstack/advanced-workflows-examples': minor
---

The error handling examples have their own package, with one workflow per error mode.

- `@loopstack/error-handling-examples` (`ErrorHandlingExamplesModule`, Studio app "Error Handling Examples"):
  `auto_retry_example`, `retry_target_example`, `error_place_example`, `manual_retry_example`,
  `transition_timeout_example` and `sub_workflow_error_place_example`, titled "Error Handling - … Example". Each
  workflow has a spec.
- `@loopstack/advanced-workflows-examples` no longer contains the error retry example: `ErrorRetryWorkflow`
  (`error_retry`) and its tools are removed. Use `@loopstack/error-handling-examples` instead.
