---
'@loopstack/remote-client': minor
---

Remove `RemoteClient.gitClone`.

The method sent `POST /git/clone`, a route `@loopstack/remote-server` does not serve, so every call ended in a
404. `RemoteClient` now exposes only git operations the remote server implements; to clone a repository, run
`git clone` through `executeCommand`.
