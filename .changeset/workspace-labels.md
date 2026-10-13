---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/core': minor
'@loopstack/api': minor
'@loopstack/loopstack-studio': minor
---

Workspaces carry free-form labels an application uses to find and group them, e.g. `ticket:owner/repo#12`.

- `@loopstack/contracts` and `@loopstack/common`: `WorkspaceSchema` and `WorkspaceEntity` have a `labels: string[]`
  column. `WorkspaceCreateSchema` and `WorkspaceUpdateSchema` take `labels`; an update replaces the whole set.
- `@loopstack/api`: the workspace filter takes `labels` and returns only workspaces that carry every one of them.
- `@loopstack/core`: `WorkspaceService.findByLabels(appName, labels, user)` returns the user's oldest workspace of that
  app that carries every one of the labels.
- `@loopstack/loopstack-studio`: the dashboard shows a workspace's labels as badges on its card and in its list row.
