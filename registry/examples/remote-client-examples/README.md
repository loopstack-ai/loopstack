---
title: Remote Client Examples
description: Remote agent workflow examples for Loopstack — run shell commands and edit files on a remote workspace, and browse its files, with the @loopstack/remote-client tools.
---

# @loopstack/remote-client-examples

> Remote agent workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways a workflow works against a remote workspace with the `@loopstack/remote-client` tools: running shell commands and editing files, and browsing the workspace's files. Reach for these when a workflow operates on a machine other than the one the app runs on.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/remote-client-examples src/remote-client-examples
npm install @loopstack/remote-client @loopstack/remote-file-explorer-module
```

Register the module together with the `RemoteClientModule` root (see below):

```typescript
import { RemoteClientExamplesModule } from './remote-client-examples/remote-client-examples.module';
```

## Install as a Dependency

```bash
npm install @loopstack/remote-client-examples @loopstack/remote-client
```

```typescript
import { RemoteClientExamplesModule } from '@loopstack/remote-client-examples';
```

## Required app-module configuration

The remote tools (`BashTool`, `ReadTool`, `WriteTool`, `GlobTool`) are provided by the `RemoteClientModule` root. `RemoteClientExamplesModule` only declares its environment slot via `RemoteClientModule.forFeature(...)`, so the app must import `RemoteClientModule.forRoot(...)` once in its root module — without it the app fails at boot. Register at least one environment whose `type` matches the slot (`sandbox`):

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteClientExamplesModule } from '@loopstack/remote-client-examples';

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

| Example                         | Studio title                            | Description                                                                  |
| ------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| [Command](#command)             | `Remote Client - Command Example`       | Run commands and edit files on a remote machine via `BashTool` + `WriteTool` |
| [File Explorer](#file-explorer) | `Remote Client - File Explorer Example` | Browse a remote workspace via `GlobTool` + `ReadTool`                        |

---

## Command

Writes a file with `WriteTool`, runs a shell command against it with `BashTool`, then reads the file back with `ReadTool`. Each step posts a message with its result.

```bash
loopstack run remote_client_example
```

### Files

- `remote-client-example.workflow.ts` — workflow class

## File Explorer

Uses `GlobTool` to find Markdown files in the remote workspace and `ReadTool` to read the first match.

```bash
loopstack run remote_file_explorer_example
```

### Files

- `remote-file-explorer-example.workflow.ts` — workflow class

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
