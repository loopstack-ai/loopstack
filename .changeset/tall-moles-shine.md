---
'@loopstack/cli': patch
---

Workspace resolution for `run` uses `client.workspaces` with a server-side `appName` filter instead of fetching a page of workspaces and filtering locally.
