---
title: Filesystem Examples
description: Workflow examples for filesystem operations in Loopstack — Docker sandbox, remote file browsing, remote command execution, local file tree.
---

# @loopstack/filesystem-examples

> Filesystem workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Four ways workflows interact with the filesystem in Loopstack: isolated Docker sandboxes, remote workspace browsing, remote command execution, and local file-tree inspection.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/filesystem-examples src/filesystem-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { FilesystemExamplesModule } from './filesystem-examples/filesystem-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), FilesystemExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/filesystem-examples
```

```typescript
import { FilesystemExamplesModule } from '@loopstack/filesystem-examples';
```

## Required app-module configuration

The Remote File Explorer and Remote Client examples connect to a remote agent. `FilesystemExamplesModule` declares the slot via `RemoteClientModule.forFeature({ slots: [{ type: 'sandbox' }] })`, but the consumer must register at least one matching environment in their root module via `RemoteClientModule.forRoot(...)`:

```typescript
import { Module } from '@nestjs/common';
import { FilesystemExamplesModule } from '@loopstack/filesystem-examples';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientModule } from '@loopstack/remote-client';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    RemoteClientModule.forRoot({
      environments: {
        available: [
          {
            type: 'sandbox',
            name: 'Local Remote Server',
            connectionUrl: process.env.SANDBOX_URL ?? 'http://localhost:3080',
            agentUrl: process.env.SANDBOX_AGENT_URL ?? 'http://localhost:3001',
            local: true,
          },
        ],
      },
    }),
    FilesystemExamplesModule,
  ],
})
export class AppModule {}
```

The `type: 'sandbox'` must match the slot type declared by `FilesystemExamplesModule`. Workspaces created in Studio auto-select the environment from the matching type.

The Sandbox and Local File Explorer examples don't depend on the remote server and work without this config.

## Environment

The Sandbox example requires Docker. The Remote File Explorer and Remote Client examples require a running remote agent (the simplest option is `@loopstack/remote-server` on `localhost:3001`).

## Examples

| Example                                       | Studio title                                | Description                                                                  |
| --------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| [Sandbox](#sandbox)                           | `Filesystem - Sandbox Example`              | Full Docker sandbox lifecycle — init, file ops, destroy                      |
| [Remote File Explorer](#remote-file-explorer) | `Filesystem - Remote File Explorer Example` | Browse a remote workspace via `GlobTool` + `ReadTool`                        |
| [Remote Client](#remote-client)               | `Filesystem - Remote Client Example`        | Run commands and edit files on a remote machine via `BashTool` + `WriteTool` |
| [Local File Explorer](#local-file-explorer)   | `Filesystem - Local File Explorer Example`  | Build a workspace file tree with `FileSystemService`                         |

---

## Sandbox

Walks the complete Docker sandbox lifecycle: `sandboxInit` → directory + file operations (`sandboxCreateDirectory`, `sandboxWriteFile`, `sandboxReadFile`, `sandboxListDirectory`, `sandboxExists`, `sandboxFileInfo`, `sandboxDelete`) → `sandboxDestroy`. Useful for isolated execution of untrusted code.

### Files

- `sandbox-example.workflow.ts` — workflow class

## Remote File Explorer

Uses `GlobTool` and `ReadTool` from `@loopstack/remote-client` to find Markdown files in a remote workspace and read the first match.

### Files

- `remote-file-explorer-example.workflow.ts` — workflow class

## Remote Client

Demonstrates `@loopstack/remote-client` beyond file browsing: write a file via `WriteTool`, run a shell command via `BashTool`, then read the result with `ReadTool`. Useful when you need command execution against a remote workspace.

### Files

- `remote-client-example.workflow.ts` — workflow class

## Local File Explorer

Demonstrates `FileSystemService` from `@loopstack/local-file-explorer-module` — builds a file tree of the workspace root and renders it as markdown. The same module also exposes a REST API for the Studio file panel.

### Files

- `local-file-explorer-example.workflow.ts` — workflow class

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
