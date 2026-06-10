---
title: Sandbox Execution
description: Executing untrusted code in Docker containers using @loopstack/sandbox-tool and @loopstack/sandbox-filesystem. Setup, file I/O inside sandboxes, and cleanup.
---

# Sandbox Execution

Run untrusted or AI-generated code safely in isolated Docker containers. The sandbox packages provide tools for creating disposable execution environments with filesystem access, letting workflows execute arbitrary code without risking the host system.

## Prerequisites

Docker must be installed and running on the host system before any sandbox tool is invoked. The sandbox tools shell out to the local Docker daemon to create, start, exec into, and remove containers — `sandbox_init` will fail at runtime if Docker isn't available.

Any Docker image works — `imageName` is passed straight through to Docker, so anything you'd put after `docker pull` (`node:18`, `python:3.11-slim`, your own private image) is valid. Images are pulled automatically on first use, so the first init for an unfamiliar image may be slow.

## Host ↔ Container Filesystem

`sandbox_init` takes two related paths:

- `projectOutPath` — an absolute path on the **host** machine.
- `rootPath` — a path **inside** the container (defaults to `workspace`).

The host directory at `projectOutPath` is bind-mounted into the container at `/<rootPath>`. Anything the container writes under `/<rootPath>` shows up at `projectOutPath` on the host, and vice versa — it's the same set of files viewed from two sides. Use this to feed inputs into the sandbox, read outputs back out, and persist artifacts across container destroys.

## Setup

```typescript
import { Module } from '@nestjs/common';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';

@Module({
  imports: [SandboxFilesystemModule],
  providers: [SandboxWorkflow],
  exports: [SandboxWorkflow],
})
export class SandboxModule {}
```

## Example Workflow

```typescript
import { z } from 'zod';
import { BaseWorkflow, ToolResult, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import {
  SandboxCreateDirectory,
  SandboxDelete,
  SandboxReadFile,
  SandboxWriteFile,
} from '@loopstack/sandbox-filesystem';
import { SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';

interface SandboxState {
  containerId?: string;
}

@Workflow({
  widget: __dirname + '/sandbox.ui.yaml',
  schema: z.object({ outputDir: z.string().default(process.cwd() + '/out') }),
})
export class SandboxWorkflow extends BaseWorkflow<{ outputDir: string }, SandboxState> {
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
  async initSandbox(state: SandboxState, ctx: RunContext): Promise<SandboxState> {
    const args = ctx.args as { outputDir: string };
    const result: ToolResult = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'sandbox-container',
      projectOutPath: args.outputDir,
      rootPath: 'workspace',
    });
    return { ...state, containerId: result.data.containerId };
  }

  @Transition({ from: 'sandbox_ready', to: 'file_written' })
  async writeFile(state: SandboxState): Promise<SandboxState> {
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
    return state;
  }

  @Transition({ from: 'file_written', to: 'file_read' })
  async readFile(state: SandboxState): Promise<SandboxState> {
    await this.sandboxReadFile.call({
      containerId: state.containerId!,
      path: '/workspace/src/hello.js',
      encoding: 'utf8',
    });
    return state;
  }

  @Transition({ from: 'file_read', to: 'end' })
  async destroySandbox(state: SandboxState): Promise<unknown> {
    await this.sandboxDestroy.call({
      containerId: state.containerId!,
      removeContainer: true,
    });
    return {};
  }
}
```

## Available Tools

### Container Lifecycle

| Tool             | Args                                                              | Description                |
| ---------------- | ----------------------------------------------------------------- | -------------------------- |
| `sandboxInit`    | `containerId, imageName, containerName, projectOutPath, rootPath` | Create and start container |
| `sandboxDestroy` | `containerId, removeContainer`                                    | Stop/remove container      |

### Filesystem Operations

| Tool                     | Args                                                       | Description            |
| ------------------------ | ---------------------------------------------------------- | ---------------------- |
| `sandboxWriteFile`       | `containerId, path, content, encoding?, createParentDirs?` | Write file             |
| `sandboxReadFile`        | `containerId, path, encoding?`                             | Read file content      |
| `sandboxListDirectory`   | `containerId, path, recursive?`                            | List directory entries |
| `sandboxCreateDirectory` | `containerId, path, recursive?`                            | Create directory       |
| `sandboxDelete`          | `containerId, path, recursive?, force?`                    | Delete file/directory  |
| `sandboxExists`          | `containerId, path`                                        | Check if path exists   |
| `sandboxFileInfo`        | `containerId, path`                                        | Get file metadata      |

### Command Execution

| Tool             | Args                                                                    | Description              |
| ---------------- | ----------------------------------------------------------------------- | ------------------------ |
| `sandboxCommand` | `containerId, executable, args?, workingDirectory?, envVars?, timeout?` | Run command in container |

## Security

- Path traversal detection and prevention
- Shell argument escaping
- Isolated Docker containers with volume mounting
- Configurable timeouts on command execution

## Registry References

- [sandbox-example-workflow](https://loopstack.ai/registry/loopstack-sandbox-example-workflow) — Full sandbox lifecycle: init, create directory, write/read files, list directory, check existence, get file info, delete, and destroy
