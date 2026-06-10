---
title: Remote File Explorer Module
description: REST API controller for browsing files on remote Loopstack workspaces — RemoteFileExplorerModule, RemoteFileExplorerController, file tree and file content endpoints, proxies requests via RemoteClient and EnvironmentService
---

# @loopstack/remote-file-explorer-module

> File browsing module for the [Loopstack](https://loopstack.ai) automation framework.

Exposes REST endpoints that let a frontend (like Loopstack Studio) browse the file system of a remote workspace. The controller resolves the workspace's remote agent URL and proxies requests through `RemoteClient` from `@loopstack/remote-client`.

## When to Use

- You are building a UI that needs to render a **file tree** and display **file contents** for a remote workspace.
- You want authenticated REST endpoints that proxy file requests to a remote agent without exposing the agent URL to the client.
- Use `@loopstack/local-file-explorer-module` instead if the files are on the local machine.
- Use `GlobTool` / `ReadTool` from `@loopstack/remote-client` instead if you need file access inside a workflow (this module provides no workflow tools).

## Installation

```sh
npm install @loopstack/remote-file-explorer-module
```

Register the module in your app:

```ts
import { Module } from '@nestjs/common';
import { RemoteFileExplorerModule } from '@loopstack/remote-file-explorer-module';

@Module({
  imports: [RemoteFileExplorerModule],
})
export class AppModule {}
```

`RemoteFileExplorerModule` depends on `RemoteClient` and `EnvironmentService` from `@loopstack/remote-client`, which must be available in the DI container (import `RemoteClientModule` in a parent module).

### Feature gating

Use `forFeature()` to register the module with optional feature-flag configuration:

```ts
RemoteFileExplorerModule.forFeature({ enabled: true, environments: ['production'] });
```

## Quick Start

Once imported, the controller is available at `/api/v1/workspaces/:workspaceId/files`. No additional setup is required beyond having `RemoteClientModule` registered.

```http
GET /api/v1/workspaces/:workspaceId/files/tree?path=src
GET /api/v1/workspaces/:workspaceId/files/read?path=src/index.ts
```

Both endpoints require an authenticated user (resolved via `@CurrentUser()`).

## How It Works

```
Frontend (Studio)
    |
    |  GET /api/v1/workspaces/:workspaceId/files/tree?path=src
    v
RemoteFileExplorerController
    |
    |  EnvironmentService.getAgentUrlForWorkspace(workspaceId)
    |  -> resolves the remote agent URL for the workspace
    |
    |  RemoteClient.getFileTree(agentUrl, path)
    v
Remote Agent (remote-server)
    |
    |  reads filesystem, returns FileTreeNode[]
    v
Response -> Frontend
```

The controller has two endpoints:

1. **`GET tree`** -- calls `RemoteClient.getFileTree()`. Defaults to `./src` if no `path` query param is provided.
2. **`GET read`** -- calls `RemoteClient.readFile()`. Requires a `path` query param.

Both endpoints resolve the workspace's agent URL via `EnvironmentService.getAgentUrlForWorkspace()` before proxying.

## Endpoints Reference

### GET `/api/v1/workspaces/:workspaceId/files/tree`

Returns the directory tree for the given path.

| Parameter     | In    | Type     | Required | Description                             |
| ------------- | ----- | -------- | -------- | --------------------------------------- |
| `workspaceId` | path  | `string` | yes      | The workspace ID                        |
| `path`        | query | `string` | no       | Base path to list (defaults to `./src`) |

**Response:** `FileTreeNode[]`

```ts
interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}
```

### GET `/api/v1/workspaces/:workspaceId/files/read`

Returns the content of a single file.

| Parameter     | In    | Type     | Required | Description       |
| ------------- | ----- | -------- | -------- | ----------------- |
| `workspaceId` | path  | `string` | yes      | The workspace ID  |
| `path`        | query | `string` | yes      | File path to read |

**Response:** `FileReadResponse`

```ts
interface FileReadResponse {
  content: string;
}
```

## Configuration

`RemoteFileExplorerModule.forFeature()` accepts an optional config object:

| Option         | Type       | Default | Description                            |
| -------------- | ---------- | ------- | -------------------------------------- |
| `enabled`      | `boolean`  | `true`  | Whether the feature is active          |
| `environments` | `string[]` | all     | Restrict to specific environment names |

No environment variables are required by this module itself. The remote agent URL is resolved at runtime by `EnvironmentService` from `@loopstack/remote-client`.

## Public API

- **Module:** `RemoteFileExplorerModule` -- NestJS module with `forFeature()` static method
- **Controller:** `RemoteFileExplorerController` -- REST controller with `getFileTree()` and `readFile()` endpoints

## Dependencies

| Package                    | Role                                            |
| -------------------------- | ----------------------------------------------- |
| `@loopstack/common`        | Shared utilities, `CurrentUser` decorator       |
| `@loopstack/remote-client` | `RemoteClient` service and `EnvironmentService` |
| `@nestjs/common`           | NestJS framework                                |
| `@nestjs/typeorm`          | TypeORM integration                             |
| `typeorm`                  | ORM                                             |

## Related

- [`@loopstack/remote-client`](https://loopstack.ai/docs/registry/features/remote-client-module) -- the underlying client this module proxies through; also provides `GlobTool`, `ReadTool`, and other workflow tools for remote file operations
- [`@loopstack/local-file-explorer-module`](https://loopstack.ai/docs/registry/features/local-file-explorer-module) -- same concept for local filesystems instead of remote agents
- [Remote File Explorer example workflow](https://github.com/nicobrinkkemper/loopstack/tree/main/registry/examples/remote-file-explorer-example-workflow) -- demonstrates using `GlobTool` and `ReadTool` from `@loopstack/remote-client` in a workflow

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
