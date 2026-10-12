---
title: Remote Client Examples
description: Remote agent workflow examples for Loopstack — run shell commands and edit files on a remote workspace, and search its files, with the @loopstack/remote-client tools; plus the Remote Files panel from @loopstack/remote-file-explorer.
---

# Remote Client Examples

> Remote agent workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways a workflow works against a remote workspace with the `@loopstack/remote-client` tools: running shell commands and editing files, and searching the workspace's files. The app also enables the Remote Files panel in Studio, so you can browse the same workspace by hand. Reach for these when a workflow operates on a machine other than the one the app runs on.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/common @loopstack/remote-client @loopstack/remote-file-explorer
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientExamplesModule } from './remote-client/remote-client-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), RemoteClientExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

The remote tools (`BashTool`, `ReadTool`, `WriteTool`, `GlobTool`, `GrepTool`) are provided by the `RemoteClientModule` root. `RemoteClientExamplesModule` only declares its environment slot via `RemoteClientModule.forFeature(...)`, so the app must import `RemoteClientModule.forRoot(...)` once in its root module — without it the app fails at boot. Register at least one environment whose `type` matches the slot (`sandbox`):

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteClientExamplesModule } from './remote-client/remote-client-examples.module';

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
    RemoteClientExamplesModule,
  ],
})
export class AppModule {}
```

Workspaces created in Studio auto-select the environment from the matching type.

## Environment

Both workflows need a running remote agent (the simplest option is `@loopstack/remote-server` on `localhost:3001`), reachable through the environment configured above. No secrets are required.

## Examples

| Example                     | Studio title                          | Description                                                                              |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Command](#command)         | `Remote Client - Command Example`     | Run commands and edit files on a remote machine via `BashTool` + `WriteTool`             |
| [File Search](#file-search) | `Remote Client - File Search Example` | Find files by name and by content via `GlobTool` + `GrepTool`, then read with `ReadTool` |

The app also shows the [Remote Files panel](#remote-files-panel) in Studio. It comes from a module import, not from a workflow.

---

## Command

Writes a file with `WriteTool`, runs a shell command against it with `BashTool`, then reads the file back with `ReadTool`. Each step posts a message with its result.

```bash
loopstack run remote_client_example
```

### Files

- `remote-client-example.workflow.ts` — workflow class

## File Search

Searches the remote workspace in three steps, and each step posts a message with its result: `GlobTool` finds the Markdown files by name (`**/*.md`), `GrepTool` finds the lines in them that contain `TODO`, and `ReadTool` reads the first file with a match. When no line matches, the workflow says so and ends.

```bash
loopstack run file_search_example
```

### Files

- `file-search-example.workflow.ts` — workflow class

## Remote Files panel

`RemoteFileExplorerModule.forFeature()` from `@loopstack/remote-file-explorer` adds the **Remote Files** sidebar panel to this app in Studio. Open a workspace of the **Remote Client Examples** app and select **Remote Files** in the sidebar to browse the remote workspace and open its files — for example the file the Command example writes. The panel reads through two REST routes of the same module:

```http
GET /api/v1/workspaces/:workspaceId/remote-files/tree?path=<dir>
GET /api/v1/workspaces/:workspaceId/remote-files/read?path=<file>
```

The module has no workflow tools. Inside a workflow, use the `@loopstack/remote-client` tools as the examples above do.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
