---
'@loopstack/contracts': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/client': minor
---

Config and dashboard move to zod-first contracts and the SDK. `StudioAppConfigSchema`, `WorkflowConfigSchema`, `ToolConfigSchema`, `WorkflowSourceSchema`, `AvailableEnvironmentSchema`, and `DashboardStatsSchema` replace the class-transformer DTOs; the config and dashboard controllers map responses explicitly with dev-time schema assertion. `StudioAppConfig` now has a single definition in contracts (core's discovery service adopts it), the config interfaces move from the `/types` to the `/api` subpath, and `DashboardStatsInterface` drops the never-sent `workspaceCount`/`totalAutomations` fields. Wire fixes: workflow config responses now include `workflowName`, and dashboard `recentRuns`/`recentErrors` are mapped `WorkflowItem` projections instead of raw entities. The client gains `config` (apps, workflowConfig, workflowSource, tools, tool, availableEnvironments) and `dashboard` (stats) resources with envKey-scoped query descriptors.
