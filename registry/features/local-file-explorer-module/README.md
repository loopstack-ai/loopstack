---
title: Local File Explorer Module
description: Loopstack registry feature exposing the local filesystem of a workspace as a REST API. LocalFileExplorerModule, LocalFileExplorerController endpoints for /files/tree and /files/read, FileApiService, FileSystemService, FileExplorerNodeDto, FileContentDto, path traversal protection, 10 MB file size limit, workflow YAML parsing.
---

# @loopstack/local-file-explorer-module

> Local filesystem browsing module for the [Loopstack](https://loopstack.ai) automation framework.

Exposes the local files belonging to a workspace as a workspace-scoped REST API. Used by Studio's file-explorer panel to browse and read project files without giving the browser direct disk access. Drop the module into your app and the endpoints are wired up automatically.

## When to Use

- You want Studio (or any frontend) to render a project file tree for a workspace.
- You want to read individual source files — including parsed workflow YAML — through an authenticated HTTP endpoint.
- You're running the Loopstack backend on the same machine as the project files. For remote machines, use [`@loopstack/remote-file-explorer-module`](https://loopstack.ai/docs/registry/features/remote-file-explorer-module) instead.

## Installation

```bash
npm install @loopstack/local-file-explorer-module
```

Import the module in your app:

```typescript
import { Module } from '@nestjs/common';
import { LocalFileExplorerModule } from '@loopstack/local-file-explorer-module';

@Module({
  imports: [LocalFileExplorerModule],
})
export class AppModule {}
```

Use `LocalFileExplorerModule.forFeature({ enabled: true, environments: ['local'] })` if you want to register it as a Studio feature (lights up the file-explorer panel for that workspace).

## Quick Start

Once the module is imported, the endpoints are live. From a client:

```
GET /api/v1/workspaces/:workspaceId/files/tree
GET /api/v1/workspaces/:workspaceId/files/read?path=src/index.ts
```

Both require an authenticated user (via the standard `@CurrentUser()` mechanism) and resolve the workspace's `appName` to scope file access to that workspace's project directory.

## How It Works

```
HTTP request ──► LocalFileExplorerController
                      │
                      ├─► WorkspaceService.getWorkspace(workspaceId, userId)   // auth + scoping
                      │
                      └─► FileApiService ──► FileSystemService ──► fs
```

`LocalFileExplorerController` is mounted at `/api/v1/workspaces/:workspaceId/files`. Every request first resolves the workspace through `WorkspaceService` — this verifies the current user owns the workspace and yields its `appName`, which becomes the root for all file operations. `FileApiService` then delegates to `FileSystemService` for raw filesystem access.

### Security

- **Workspace scoping** — file paths are resolved relative to the workspace's `appName` directory. There is no way to read files outside that root through the API.
- **Authenticated routes** — `@CurrentUser()` is required on every endpoint; unauthenticated requests are rejected by the standard Loopstack auth layer.
- **Path traversal protection** — `FileSystemService` rejects paths that escape the workspace root.
- **File size limit** — single-file reads are capped at **10 MB**. Larger files return an empty content payload and a warning is logged.

### Ignored directories

`FileSystemService` skips the following directories when walking the tree:

```
node_modules, .git, .next, .nuxt, dist, build, .cache, .turbo
```

This keeps responses small and prevents accidentally walking into vendored or generated trees.

### YAML workflow parsing

When `read` returns a `.yaml` / `.yml` file whose content parses to an object containing a `transitions` array, the parsed config is also returned on `workflowConfig`. Studio uses this to render workflow files with extra UI affordances without re-parsing on the client.

## Endpoints

| Method | Path                                                | Auth             | Returns                                                                |
| ------ | --------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| `GET`  | `/api/v1/workspaces/:workspaceId/files/tree`        | `@CurrentUser()` | `FileExplorerNodeDto[]` — recursive tree under the workspace's project |
| `GET`  | `/api/v1/workspaces/:workspaceId/files/read?path=…` | `@CurrentUser()` | `FileContentDto` — file content (+ `workflowConfig` for workflow YAML) |

### `FileExplorerNodeDto`

Each node represents a file or directory under the workspace root.

| Field      | Type                     | Description                               |
| ---------- | ------------------------ | ----------------------------------------- |
| `name`     | `string`                 | File or directory name                    |
| `path`     | `string`                 | Workspace-relative path                   |
| `type`     | `'file' \| 'directory'`  | Node type                                 |
| `children` | `FileExplorerNodeDto[]?` | Present for directories; absent for files |

### `FileContentDto`

| Field            | Type                       | Description                                                     |
| ---------------- | -------------------------- | --------------------------------------------------------------- |
| `path`           | `string`                   | Workspace-relative path requested                               |
| `content`        | `string`                   | UTF-8 file content (empty when the file exceeds the size limit) |
| `workflowConfig` | `Record<string, unknown>?` | Parsed YAML config when the file is a workflow YAML             |

## Public API

- `LocalFileExplorerModule` — NestJS module to import.
- `LocalFileExplorerController` — REST controller (auto-registered when the module is imported).
- `FileApiService` — high-level service used by the controller; safe to inject into your own code.
- `FileSystemService` — low-level filesystem helper.

## Dependencies

- `@loopstack/common`, `@loopstack/contracts`, `@loopstack/core` — workspace resolution, auth decorator, feature registration.
- `@nestjs/common`, `@nestjs/config`, `@nestjs/typeorm`, `typeorm` — standard Loopstack backend stack.
- `yaml` — for parsing workflow YAML files on read.

## Related

- [`@loopstack/remote-file-explorer-module`](https://loopstack.ai/docs/registry/features/remote-file-explorer-module) — same API surface but proxies to a remote agent for remote machines.

## About

Part of the [Loopstack](https://loopstack.ai) registry. MIT-licensed.
