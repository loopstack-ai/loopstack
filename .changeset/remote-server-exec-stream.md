---
'@loopstack/remote-server': patch
---

Serve the streamed command routes `@loopstack/remote-client` calls: `POST /exec/stream`, `GET /exec/stream/:id`,
`GET /exec/stream/:id/log?offset=` and `DELETE /exec/stream/:id`. The `bash` tool, `RemoteClient.streamCommand` and
`RemoteClient.purgeWorkspace` now work against this server. Each command runs in its own process group, so a timeout
or a kill stops the whole command tree, not just the `sh -c` wrapper.
