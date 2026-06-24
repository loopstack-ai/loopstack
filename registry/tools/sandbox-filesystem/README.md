---
title: Sandbox Filesystem
description: SandboxFilesystemModule providing SandboxWriteFile, SandboxReadFile, SandboxListDirectory, SandboxCreateDirectory, SandboxDelete, SandboxExists, SandboxFileInfo tools for secure file operations inside Docker containers. Depends on @loopstack/sandbox-tool.
---

# @loopstack/sandbox-filesystem

> Sandbox filesystem module for the [Loopstack](https://loopstack.ai) automation framework.

Provides secure filesystem operations inside Docker sandbox containers. Use it alongside `@loopstack/sandbox-tool` to read, write, list, create, delete, and inspect files and directories in isolated environments without risking the host system.

## When to Use

- You need to read or write files inside an isolated Docker container (e.g., code execution sandboxes, build pipelines)
- Your workflow generates untrusted or AI-produced files and you want filesystem access confined to a container
- You want structured directory listing, existence checks, or file metadata from inside a sandbox
- You already use `@loopstack/sandbox-tool` for container lifecycle and need filesystem operations on top

## Installation

```bash
npm install @loopstack/sandbox-filesystem @loopstack/sandbox-tool
```

Import `SandboxFilesystemModule` in your module. It automatically imports `SandboxToolModule`, so container lifecycle tools (`SandboxInit`, `SandboxDestroy`, `SandboxCommand`) are available too.

```typescript
import { Module } from '@nestjs/common';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';

@Module({
  imports: [SandboxFilesystemModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow],
})
export class MyModule {}
```

## Quick Start

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SandboxCreateDirectory, SandboxReadFile, SandboxWriteFile } from '@loopstack/sandbox-filesystem';
import { SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';

interface SandboxState {
  containerId?: string;
}

const SandboxArgsSchema = z.object({ outputDir: z.string().default(process.cwd() + '/out') });
type SandboxArgs = z.infer<typeof SandboxArgsSchema>;

@Workflow({
  schema: SandboxArgsSchema,
})
export class SandboxWorkflow extends BaseWorkflow<SandboxArgs> {
  constructor(
    private readonly sandboxInit: SandboxInit,
    private readonly sandboxDestroy: SandboxDestroy,
    private readonly sandboxWriteFile: SandboxWriteFile,
    private readonly sandboxReadFile: SandboxReadFile,
    private readonly sandboxCreateDirectory: SandboxCreateDirectory,
  ) {
    super();
  }

  @Transition({ to: 'sandbox_ready' })
  async initSandbox(state: SandboxState, ctx: RunContext<SandboxArgs>) {
    const result = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'sandbox-container',
      projectOutPath: ctx.args.outputDir,
      rootPath: 'workspace',
    });
    this.assignState({ containerId: result.data.containerId });
  }

  @Transition({ from: 'sandbox_ready', to: 'file_written' })
  async writeFile(state: SandboxState) {
    await this.sandboxCreateDirectory.call({
      containerId: state.containerId!,
      path: '/workspace/src',
      recursive: true,
    });

    await this.sandboxWriteFile.call({
      containerId: state.containerId!,
      path: '/workspace/src/hello.js',
      content: "console.log('Hello from sandbox!');",
      encoding: 'utf8',
      createParentDirs: true,
    });
  }

  @Transition({ from: 'file_written', to: 'file_read' })
  async readFile(state: SandboxState) {
    await this.sandboxReadFile.call({
      containerId: state.containerId!,
      path: '/workspace/src/hello.js',
      encoding: 'utf8',
    });
  }

  @Transition({ from: 'file_read', to: 'end' })
  async destroySandbox(state: SandboxState) {
    await this.sandboxDestroy.call({
      containerId: state.containerId!,
      removeContainer: true,
    });
  }
}
```

## How It Works

All filesystem tools delegate to `SandboxCommand` from `@loopstack/sandbox-tool`, which executes shell commands (`cat`, `mkdir`, `rm`, `stat`, `find`) inside the Docker container via the Docker exec API. Content is transferred safely using base64 encoding.

```
start ──> sandbox_ready ──> file_written ──> file_read ──> end
  |            |                  |              |           |
  v            v                  v              v           v
SandboxInit  mkdir/write       read           cleanup    SandboxDestroy
```

Container lifecycle (`SandboxInit` / `SandboxDestroy`) comes from `@loopstack/sandbox-tool`. This module adds the filesystem layer on top.

## Tools Reference

Every tool requires a `containerId` argument that references a container created by `SandboxInit`.

### sandbox_write_file

Write content to a file in a sandbox container.

| Arg                | Type                 | Required              | Description                          |
| ------------------ | -------------------- | --------------------- | ------------------------------------ |
| `containerId`      | `string`             | Yes                   | Container ID                         |
| `path`             | `string`             | Yes                   | File path inside the container       |
| `content`          | `string`             | Yes                   | Content to write                     |
| `encoding`         | `'utf8' \| 'base64'` | No (default `'utf8'`) | Content encoding                     |
| `createParentDirs` | `boolean`            | No (default `true`)   | Create parent directories if missing |

**Returns:** `{ path: string, bytesWritten: number }`

### sandbox_read_file

Read file contents from a sandbox container.

| Arg           | Type                 | Required              | Description                    |
| ------------- | -------------------- | --------------------- | ------------------------------ |
| `containerId` | `string`             | Yes                   | Container ID                   |
| `path`        | `string`             | Yes                   | File path inside the container |
| `encoding`    | `'utf8' \| 'base64'` | No (default `'utf8'`) | Encoding to use when reading   |

**Returns:** `{ content: string, encoding: string }`

### sandbox_list_directory

List files and directories in a sandbox container.

| Arg           | Type      | Required             | Description                         |
| ------------- | --------- | -------------------- | ----------------------------------- |
| `containerId` | `string`  | Yes                  | Container ID                        |
| `path`        | `string`  | Yes                  | Directory path inside the container |
| `recursive`   | `boolean` | No (default `false`) | List recursively                    |

**Returns:** `{ path: string, entries: Array<{ name: string, type: 'file' | 'directory' | 'symlink' | 'other', size: number, path: string }> }`

### sandbox_create_directory

Create a directory in a sandbox container.

| Arg           | Type      | Required            | Description                          |
| ------------- | --------- | ------------------- | ------------------------------------ |
| `containerId` | `string`  | Yes                 | Container ID                         |
| `path`        | `string`  | Yes                 | Directory path to create             |
| `recursive`   | `boolean` | No (default `true`) | Create parent directories if missing |

**Returns:** `{ path: string, created: boolean }`

### sandbox_delete

Delete a file or directory in a sandbox container.

| Arg           | Type      | Required             | Description                         |
| ------------- | --------- | -------------------- | ----------------------------------- |
| `containerId` | `string`  | Yes                  | Container ID                        |
| `path`        | `string`  | Yes                  | Path to delete                      |
| `recursive`   | `boolean` | No (default `false`) | Recursively delete directories      |
| `force`       | `boolean` | No (default `false`) | Force deletion without confirmation |

**Returns:** `{ path: string, deleted: boolean }`

### sandbox_exists

Check if a file or directory exists in a sandbox container.

| Arg           | Type     | Required | Description   |
| ------------- | -------- | -------- | ------------- |
| `containerId` | `string` | Yes      | Container ID  |
| `path`        | `string` | Yes      | Path to check |

**Returns:** `{ path: string, exists: boolean, type: 'file' | 'directory' | 'symlink' | 'other' | null }`

### sandbox_file_info

Get detailed information about a file or directory in a sandbox container.

| Arg           | Type     | Required | Description     |
| ------------- | -------- | -------- | --------------- |
| `containerId` | `string` | Yes      | Container ID    |
| `path`        | `string` | Yes      | Path to inspect |

**Returns:** `{ path: string, name: string, type: 'file' | 'directory' | 'symlink' | 'other', size: number, permissions: string, owner: string, group: string, modifiedAt: string, accessedAt: string, createdAt: string }`

## Public API

- **Module:** `SandboxFilesystemModule`
- **Tools:** `SandboxWriteFile`, `SandboxReadFile`, `SandboxListDirectory`, `SandboxCreateDirectory`, `SandboxDelete`, `SandboxExists`, `SandboxFileInfo`

## Dependencies

| Package                   | Role                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@loopstack/common`       | Base tool class, decorators, types                                                                                 |
| `@loopstack/sandbox-tool` | Container lifecycle (`SandboxInit`, `SandboxDestroy`) and `SandboxCommand` used internally by all filesystem tools |
| `@nestjs/common`          | NestJS dependency injection                                                                                        |
| `zod`                     | Schema validation                                                                                                  |

## Related

- [Sandbox Execution](https://loopstack.ai/docs/build/integrations/sandbox) -- Setup guide, full tool table, and security details for sandbox containers
- [filesystem-examples#sandbox](https://loopstack.ai/registry/loopstack-filesystem-examples#sandbox) -- Complete example covering init, create directory, write/read files, list, exists, file info, delete, and destroy
- [@loopstack/sandbox-tool](https://loopstack.ai/docs/registry/tools/sandbox-tool) -- Container lifecycle and command execution (required companion package)

## About

Author: Tobias Blattermann, Jakob Klippel

License: MIT
