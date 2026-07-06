---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/api': minor
---

Adopt the typed `ClientMessage` union from `@loopstack/contracts/events` across the event pipeline. `ClientMessageService` now exposes typed dispatch methods (`dispatchWorkflowCreated`/`dispatchWorkflowUpdated`/`dispatchDocumentCreated`) and validates messages against the schema outside production; `workflow.updated` events carry the workflow `status` inline. The untyped `ClientMessageInterface` and `ClientMessageDto` are removed, and `@loopstack/common` re-exports `WorkflowState` from contracts instead of duplicating the enum.
