---
title: Remote Client Module
description: HTTP client and workflow tools for Loopstack remote servers — RemoteClientModule, RemoteClient service, EnvironmentService, ReadTool, WriteTool, EditTool, BashTool, GlobTool, GrepTool, RebuildAppTool, ResetWorkspaceTool, LogsTool, SyncSecretsTool, file operations, shell commands, environment management on remote workspaces
---

# @loopstack/remote-client

> Remote environment module for the [Loopstack](https://loopstack.ai) automation framework.

HTTP client and workflow tools for communicating with a Loopstack remote server — the sandboxed process that owns a workspace's filesystem and shell. This module provides the foundation that other feature modules (git, code-agent, file-explorer) build on top of.

## When to Use

- You need to read, write, or edit files on a remote workspace from within a workflow
- You need to execute shell commands on a remote instance
- You need to manage application lifecycle (rebuild, reset, logs) on a remote environment
- You are building a module that needs low-level access to the remote server API — inject `RemoteClient` directly

## Installation

```sh
npm install @loopstack/remote-client
```

Register the module with `forRoot()`:

```ts
import { RemoteClientModule } from '@loopstack/remote-client';

@Module({
  imports: [RemoteClientModule.forRoot()],
})
export class AppModule {}
```

`RemoteClientModule.forRoot()` registers globally and depends on `SecretsModule` and TypeORM entities (`WorkspaceEntity`, `WorkspaceEnvironmentEntity`).

## Quick Start

Inject tools directly into your workflow via the constructor — they are NestJS providers resolved by their `@Tool({ name })` value through DI:

```ts
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { BashTool, EditTool, ReadTool } from '@loopstack/remote-client';

@Workflow({ uiConfig: __dirname + '/my.ui.yaml' })
export class MyWorkflow extends BaseWorkflow {
  constructor(
    private readonly read: ReadTool,
    private readonly edit: EditTool,
    private readonly bash: BashTool,
  ) {
    super();
  }

  @Transition({ from: 'ready', to: 'done' })
  async bumpVersion(state: unknown, ctx: RunContext): Promise<void> {
    const { data } = await this.read.call({ file_path: 'package.json' });

    await this.edit.call({
      file_path: 'package.json',
      old_string: '"version": "0.1.0"',
      new_string: '"version": "0.2.0"',
    });

    await this.bash.call({ command: 'npm install' });
  }
}
```

Every tool automatically resolves the remote agent URL from the current execution scope — you never pass connection details manually.

## How It Works

A Loopstack workspace runs inside a remote server (container, VM, or local process) that exposes an HTTP API for file operations, shell commands, and environment management.

```
Workflow / Tool
      |
      v
  EnvironmentService  -->  resolves agent URL from execution scope
      |
      v
  RemoteClient        -->  typed HTTP client (fetch-based)
      |
      v
  Remote Server       -->  /files/*, /exec, /app/*, /git/*
```

**`EnvironmentService`** resolves the correct remote agent URL for the current workflow execution. It caches environments per execution scope and prefers the `sandbox` slot by default.

**`RemoteClient`** is a plain `@Injectable()` service that wraps all HTTP calls to the remote server. It handles file operations, shell execution, app lifecycle, and git operations. You can inject it directly for advanced use cases.

### Using `RemoteClient` directly

For cases where tools are not sufficient, inject `RemoteClient` and `EnvironmentService`:

```ts
import { Injectable } from '@nestjs/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

@Injectable()
export class MyService {
  constructor(
    private readonly client: RemoteClient,
    private readonly env: EnvironmentService,
  ) {}

  async listFiles(path: string): Promise<string[]> {
    const url = await this.env.getAgentUrl();
    const result = await this.client.glob(url, `${path}/**/*`);
    return result.files;
  }
}
```

### `forFeature()` — Registering environment slots

Use `RemoteClientModule.forFeature()` to register environment slot configurations from other modules:

```ts
RemoteClientModule.forFeature({
  slots: [{ id: 'sandbox', label: 'Sandbox', type: 'fly' }],
});
```

## Tools Reference

All tools resolve the remote agent URL automatically from the execution scope.

### File Operations

#### `read`

Reads a file from a remote instance. Returns file content. Supports offset and limit for reading specific line ranges.

| Arg         | Type     | Required | Description                                   |
| ----------- | -------- | -------- | --------------------------------------------- |
| `file_path` | `string` | Yes      | The file path to read                         |
| `offset`    | `number` | No       | Line number to start reading from (1-indexed) |
| `limit`     | `number` | No       | Number of lines to read                       |

**Returns:** `{ content: string, path: string }`

#### `write`

Writes a file to a remote instance. Creates parent directories if needed. Overwrites existing files.

| Arg         | Type     | Required | Description                      |
| ----------- | -------- | -------- | -------------------------------- |
| `file_path` | `string` | Yes      | The file path to write           |
| `content`   | `string` | Yes      | The content to write to the file |

**Returns:** `{ success: boolean, path: string }`

#### `edit`

Performs exact string replacement in a file on a remote instance. Fails if `old_string` is not unique unless `replace_all` is true.

| Arg           | Type      | Required | Description                              |
| ------------- | --------- | -------- | ---------------------------------------- |
| `file_path`   | `string`  | Yes      | The file path to edit                    |
| `old_string`  | `string`  | Yes      | The exact string to find and replace     |
| `new_string`  | `string`  | Yes      | The replacement string                   |
| `replace_all` | `boolean` | No       | Replace all occurrences (default: false) |

**Returns:** `{ success: boolean, path: string, replacements: number }`

### Search

#### `glob`

Finds files by glob pattern on a remote instance. Returns relative file paths.

| Arg       | Type     | Required | Description                                        |
| --------- | -------- | -------- | -------------------------------------------------- |
| `pattern` | `string` | Yes      | Glob pattern to match files (e.g. `**/*.ts`)       |
| `path`    | `string` | No       | Directory to search in, relative to workspace root |

**Returns:** `{ files: string[] }`

#### `grep`

Searches file contents by regex pattern on a remote instance. Returns matching lines with file paths and line numbers.

| Arg                | Type      | Required | Description                                        |
| ------------------ | --------- | -------- | -------------------------------------------------- |
| `pattern`          | `string`  | Yes      | Regex pattern to search for in file contents       |
| `path`             | `string`  | No       | Directory to search in, relative to workspace root |
| `glob`             | `string`  | No       | Glob pattern to filter files (e.g. `*.ts`)         |
| `type`             | `string`  | No       | File type filter (e.g. `js`, `ts`, `py`)           |
| `case_insensitive` | `boolean` | No       | Case-insensitive search                            |

**Returns:** `{ matches: { file: string, line: number, content: string }[] }`

### Shell

#### `bash`

Executes a shell command on a remote instance. Returns stdout, stderr, and exit code.

| Arg       | Type     | Required | Description                  |
| --------- | -------- | -------- | ---------------------------- |
| `command` | `string` | Yes      | The shell command to execute |
| `timeout` | `number` | No       | Timeout in milliseconds      |

**Returns:** `{ stdout: string, stderr: string, exitCode: number }`

### App Lifecycle

#### `rebuild_app`

Rebuilds and restarts the app on a remote instance. Takes no arguments.

**Returns:** `{ success: boolean, message: string }`

#### `reset_workspace`

Resets the workspace to its initial state, clearing all changes, temp files, database, and Redis. Takes no arguments.

**Returns:** `{ success: boolean, message: string }`

#### `logs`

Retrieves application logs from the remote instance. Returns stdout and/or stderr output from the running application.

| Arg     | Type                        | Required | Description                                                  |
| ------- | --------------------------- | -------- | ------------------------------------------------------------ |
| `lines` | `number`                    | No       | Number of recent log lines to return (default 100, max 5000) |
| `type`  | `"out" \| "error" \| "all"` | No       | Which logs to retrieve (default `"all"`)                     |

**Returns:** `{ stdout: string, stderr: string }`

### Secrets

#### `sync_secrets`

Syncs all workspace secrets to the remote environment as `.env` variables and restarts the app. Call this before or during app restart to ensure secrets (API keys, config values) are available.

Takes no arguments.

**Returns:** `{ success: boolean, count: number }` or `{ success: true, count: 0, message: string }` when no secrets exist.

## Configuration

### `forRoot()` options

```ts
RemoteClientModule.forRoot({
  environments: {
    available: [{ type: 'fly', label: 'Fly.io Machine' }],
  },
});
```

| Option                   | Type                              | Description                                             |
| ------------------------ | --------------------------------- | ------------------------------------------------------- |
| `environments.available` | `AvailableEnvironmentInterface[]` | List of available environment types users can provision |

## Public API

- **Module:** `RemoteClientModule`
- **Services:** `RemoteClient`, `EnvironmentService`, `EnvironmentConfigService`
- **Controller:** `EnvironmentController`
- **Tools:** `ReadTool`, `WriteTool`, `EditTool`, `BashTool`, `GlobTool`, `GrepTool`, `RebuildAppTool`, `ResetWorkspaceTool`, `LogsTool`, `SyncSecretsTool`
- **Entities:** `WorkspaceEnvironmentEntity`
- **DTOs:** `WorkspaceEnvironmentContextDto`, `WorkspaceEnvironmentDto`
- **Types:** `RemoteClientModuleOptions`, `RemoteClientFeatureOptions`, `BashArgs`, `BashResult`, `EditArgs`, `EditResult`, `GlobArgs`, `GlobResult`, `GrepArgs`, `GrepResult`, `LogsArgs`, `LogsResult`, `ReadArgs`, `ReadResult`, `RebuildAppResult`, `ResetWorkspaceResult`, `SyncSecretsResult`, `WriteArgs`, `WriteResult`, `FileReadResponse`, `FileEditResponse`, `ExecResponse`, `GlobResponse`, `GrepMatch`, `GrepResponse`

## Dependencies

- `@loopstack/common` — framework utilities, `BaseTool`, `@Tool`, `@Transition`, `EXECUTION_SCOPE`
- `@loopstack/secrets-module` — consumed by `SyncSecretsTool` to read workspace secrets
- `@nestjs/common`, `@nestjs/core` — NestJS framework and `DiscoveryModule`
- `@nestjs/typeorm`, `typeorm` — workspace and environment entity persistence
- `zod` — tool argument schema validation

## Related

- [`@loopstack/code-agent`](https://loopstack.ai/docs/registry/features/code-agent-module) — AI-powered codebase exploration agent that uses remote-client tools (glob, grep, read) under the hood
- [`@loopstack/git-module`](https://loopstack.ai/docs/registry/features/git-module) — Git tools that build on `RemoteClient` git methods
- [`@loopstack/remote-file-explorer-module`](https://loopstack.ai/docs/registry/features/remote-file-explorer-module) — File tree browsing via remote-client
- [`@loopstack/secrets-module`](https://loopstack.ai/docs/registry/features/secrets-module) — Manages the secrets that `SyncSecretsTool` pushes to remote environments

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
