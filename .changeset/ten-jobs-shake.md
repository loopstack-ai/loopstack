---
'@loopstack/loopstack-studio': minor
---

The git, file-explorer, and workspace-environment slices run on the SDK transport (`client.http` with SDK query keys), removing the last axios call sites. File-explorer cache keys and their invalidation are env-scoped, and the remote-agent log keys are scoped by agent URL. Removed from the public surface: `CodeExplorer`/`CodeExplorerProvider` (their `/api/v1/files/workflows` endpoint has no server anywhere), `createAxiosClient`, `useApiClient`, and the Studio-local cache-key builders — keys live in `@loopstack/client`'s `queryKeys`.
