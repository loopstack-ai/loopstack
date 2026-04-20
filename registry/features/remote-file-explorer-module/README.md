# @loopstack/remote-file-explorer-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

REST endpoints for browsing files in a Loopstack remote workspace. A thin proxy over `@loopstack/remote-client` designed to back a file-tree UI.

## Overview

When a UI (like the Loopstack Studio) needs to render a file tree and file contents for a remote workspace, it talks to `RemoteFileExplorerController`. The controller forwards the request to the workspace's remote agent via `RemoteClient`. No workflow tools are exposed by this module — if you want to read files from a workflow, use `ReadTool` / `GlobTool` from `@loopstack/remote-client` instead.

By using this module you'll get:

- **`RemoteFileExplorerController`** with two endpoints:
  - `GET /remote-file-explorer/tree?path=...` — returns the directory tree
  - `GET /remote-file-explorer/content?path=...` — returns the contents of a single file

## Installation

```sh
npm install @loopstack/remote-file-explorer-module
```

Register the module:

```ts
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';

@Module({
  imports: [RemoteFileExplorerModule /* ... */],
})
export class AppModule {}
```

`RemoteFileExplorerModule` depends on `RemoteClientModule`, `LoopCoreModule`, and uses `WorkspaceEntity` via TypeORM.

## How It Works

Once registered, the two endpoints are available on your backend. They resolve the workspace (from query / body params) and proxy to the workspace's remote agent:

```http
GET /remote-file-explorer/tree?workspaceId=<id>&path=src
GET /remote-file-explorer/content?workspaceId=<id>&path=src/index.ts
```

See `src/controllers/remote-file-explorer.controller.ts` for the exact shape of each response.

## Public API

- **Module:** `RemoteFileExplorerModule`
- **Controller:** `RemoteFileExplorerController`

## Dependencies

- `@loopstack/common`, `@loopstack/core` — framework
- `@loopstack/remote-client` — underlying remote file access
- `@nestjs/typeorm`, `typeorm` — workspace persistence

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
