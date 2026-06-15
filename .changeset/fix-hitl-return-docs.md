---
'@loopstack/hitl': patch
---

Fix README documentation for `AskUserWorkflow.run()` and `ConfirmUserWorkflow.run()` return values — split the immediate `QueueResult` (`{ workflowId }`) from the callback payload (`{ answer }` / `{ confirmed, markdown }`) and link to the sub-workflow callback example.
