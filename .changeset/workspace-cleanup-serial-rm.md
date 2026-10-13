---
'@loopstack/code-workspace': patch
---

Deleting workspaces no longer stalls the application. `removeWorkspaceState` removes the state directory with
an `rm` child process instead of Node's recursive `fs.rm`, so a checkout's `node_modules` walk runs outside
the process threadpool. `WorkspaceCleanupListener` chains the removals of a batch delete so they run one at a
time. The path guard checks against the state root itself and refuses an empty id or one that climbs out.
