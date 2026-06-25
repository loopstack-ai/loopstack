---
'@loopstack/loopstack-studio': minor
'@loopstack/local-file-explorer-module': minor
'@loopstack/remote-file-explorer-module': minor
'@loopstack/common': patch
---

Split the single `fileExplorer` Studio feature into two independent features: `localFileExplorer` (workspace project files via `LocalFileExplorerModule`) and `remoteFileExplorer` (remote agent files via `RemoteFileExplorerModule`). Both can be enabled side-by-side and now show distinct sidebar panels ("Files" and "Remote Files").

**URL changes (breaking):**

- `LocalFileExplorerController`: `/api/v1/workspaces/:workspaceId/files/*` → `/api/v1/workspaces/:workspaceId/local-files/*`
- `RemoteFileExplorerController`: `/api/v1/workspaces/:workspaceId/files/*` → `/api/v1/workspaces/:workspaceId/remote-files/*`

The previous shared base path could not host both controllers in the same app. The Studio API client now takes a `'local' | 'remote'` variant and routes to the matching path; `useFileTree` / `useFileContent` hooks accept the variant as their first argument.

**Feature-registration keys (breaking):**

- `registerFeature('fileExplorer', …)` → `registerFeature('localFileExplorer', …)` (in `LocalFileExplorerModule`) and `registerFeature('remoteFileExplorer', …)` (in `RemoteFileExplorerModule`).
- Studio's `AVAILABLE_FEATURES` registry exposes `localFileExplorer` and `remoteFileExplorer` instead of `fileExplorer`.

**Other:**

- `RemoteFileExplorerController.tree` no longer defaults `path` to `./src` — it now walks the workspace root when `path` is omitted, matching the local controller.

No backwards-compatibility shim — the old key/URL forms are removed.
