---
'@loopstack/loopstack-studio': minor
---

The workspaces slice runs on `@loopstack/client`/`@loopstack/react`: `useWorkspaces` re-exports the SDK hooks with a thin `useFilterWorkspaces` wrapper, the axios `api/workspaces.ts` module is removed, and components use `WorkspaceInterface`. The dead `searchColumns` wire param is dropped.
