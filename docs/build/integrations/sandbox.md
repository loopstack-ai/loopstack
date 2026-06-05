# Sandbox Execution

Run untrusted code in isolated Docker containers using `@loopstack/sandbox-tool` and `@loopstack/sandbox-filesystem`.

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
import type { LoopstackContext } from '@loopstack/common';
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
  async initSandbox(state: SandboxState, ctx: LoopstackContext): Promise<SandboxState> {
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
