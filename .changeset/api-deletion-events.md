---
'@loopstack/api': minor
---

Emit in-process domain events on deletions, so a host app can release resources it holds for the deleted
rows (disk state, containers, volumes, …): `workspace.deleted` with `{ id }` from
`WorkspaceApiService.delete`/`batchDelete` (one per deleted workspace), and `workflow.deleted` with
`{ id, workspaceId }` from `WorkflowApiService.delete`/`batchDelete` (one per deleted run). Events fire
after the delete committed, via the globally registered `EventEmitter2` — listen with
`@OnEvent('workspace.deleted')` / `@OnEvent('workflow.deleted')`. Workflow rows removed by a workspace
deletion's FK cascade do not emit individual `workflow.deleted` events; a workspace-level listener is
expected to reclaim everything the workspace owned.
