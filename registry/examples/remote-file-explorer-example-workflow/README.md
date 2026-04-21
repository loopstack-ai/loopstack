# @loopstack/remote-file-explorer-example-workflow

Demonstrates browsing a remote workspace. Imports [`@loopstack/remote-file-explorer-module`](../../features/remote-file-explorer-module) so its HTTP endpoints (`GET /tree`, `GET /read`) are live, and ships a small workflow that mirrors the same flow using `GlobTool` + `ReadTool` from `@loopstack/remote-client`.

## By using this example you'll get...

- The `RemoteFileExplorerController` mounted at `/api/v1/workspaces/:workspaceId/files/*`
- A `RemoteFileExplorerExampleWorkflow` that lists files and reads one from the remote agent
- A reference wiring for frontends that want to render a remote file tree

## Installation

```sh
loopstack add @loopstack/remote-file-explorer-example-workflow
```

`@loopstack/remote-client` must be configured with a sandbox environment pointing at a running remote agent.

## How It Works

1. The workflow globs `**/*.md` from the workspace root using `GlobTool`.
2. It reads the first match using `ReadTool`.
3. Both results are saved as `MessageDocument`s.
4. Separately, the `RemoteFileExplorerController` mounted by the module exposes the same primitives as HTTP endpoints the frontend can hit directly.

## Public API

- `RemoteFileExplorerExampleModule`
- `RemoteFileExplorerExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/remote-client`
- `@loopstack/remote-file-explorer-module`
