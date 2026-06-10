---
'@loopstack/common': minor
'@loopstack/loopstack-studio': patch
---

Rename `LoopstackContext` to `RunContext` and unify the per-job framework context interface used by both tools (`handle(args, ctx)`) and workflow transitions (trailing `ctx` param). Internal DTO renamed to `InternalRunContext`. `StudioUiConfig` slimmed down to the widget-based shape (`sidebar`, `workflowHistory`, `workflowNavigation`, `debugWorkflow` flags removed). Studio frontend api types cleanup.