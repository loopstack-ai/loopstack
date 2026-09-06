---
"@loopstack/remote-client": minor
---

Add `RemoteClient.purgeWorkspace(connectionUrl, workspaceRoot?)`.

Deletes everything under the workspace root from inside the container (via the exec endpoint, as the
container user), keeping the mount point. Use it to reclaim a workspace's data without a host-side `rm` —
it removes container-created files a non-root host process couldn't and can't touch the host filesystem.
