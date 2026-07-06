---
'@loopstack/contracts': minor
'@loopstack/api': minor
'@loopstack/client': minor
---

Workspaces move to zod-first contracts and the SDK. `WorkspaceSchema`/`WorkspaceCreateSchema`/`WorkspaceUpdateSchema`/`WorkspaceFavouriteSchema`/`WorkspaceFilterSchema` replace the class-validator DTOs; the workspace controller validates with zod pipes and maps responses through `toWorkspace`. `WorkspaceItemInterface` is merged into `WorkspaceInterface` and the unused `isLocked` field is removed. The client gains a `workspaces` resource (get, list, create, update, setFavourite, delete, batchDelete), `workspace`/`workspaceList` query descriptors, and a `patch` method on `HttpClient`.
