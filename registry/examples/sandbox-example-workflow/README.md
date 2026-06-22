---
title: Sandbox Example
description: Example workflow using Docker sandbox containers for secure filesystem operations — SandboxTool, SandboxFilesystemTool, isolated code execution
---

# @loopstack/sandbox-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to use Docker sandbox containers for secure filesystem operations.

## Overview

The Sandbox Example Workflow shows how to create isolated Docker environments and perform filesystem operations within them. It demonstrates the complete lifecycle of sandbox containers and comprehensive file management capabilities.

By using this workflow as a reference, you'll learn how to:

- Initialize and destroy Docker sandbox containers
- Create directories within sandbox environments
- Write, read, and delete files in isolated containers
- List directory contents and retrieve file metadata
- Check file existence and get detailed file information
- Manage workflow state as class properties
- Use typed `ToolResult<T>` for strongly-typed tool responses
- Define workflow input schemas via the `@Workflow` decorator

This example is useful for developers building workflows that need to execute code or manipulate files in isolated environments, such as code execution sandboxes, build pipelines, or secure file processing systems.

## Installation

```bash
npm install @loopstack/sandbox-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { SandboxExampleModule, SandboxExampleWorkflow } from '@loopstack/sandbox-example-workflow';

@StudioApp({
  title: 'Sandbox Example',
  workflows: [SandboxExampleWorkflow],
})
@Module({
  imports: [SandboxExampleModule],
})
export class MyAppModule {}
```

## How It Works

### Workflow Class

The workflow class declares inputs, state, and injects tools via the constructor:

```typescript
const SandboxExampleSchema = z.object({
  outputDir: z.string().default(process.cwd() + '/out'),
});
type SandboxExampleArgs = z.infer<typeof SandboxExampleSchema>;

@Workflow({
  title: 'Sandbox Filesystem Example',
  schema: SandboxExampleSchema,
})
export class SandboxExampleWorkflow extends BaseWorkflow<SandboxExampleArgs> {
  constructor(
    // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
    private readonly sandboxInit: SandboxInit,
    private readonly sandboxDestroy: SandboxDestroy,
    // Filesystem tools (from @loopstack/sandbox-filesystem)
    private readonly sandboxWriteFile: SandboxWriteFile,
    private readonly sandboxReadFile: SandboxReadFile,
    private readonly sandboxListDirectory: SandboxListDirectory,
    private readonly sandboxCreateDirectory: SandboxCreateDirectory,
    private readonly sandboxDelete: SandboxDelete,
    private readonly sandboxExists: SandboxExists,
    private readonly sandboxFileInfo: SandboxFileInfo,
  ) {
    super();
  }

  private formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) return '(empty)';
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
```

### Sandbox Lifecycle

Initialize a Docker container before performing filesystem operations. The container ID is saved to the state object for use in subsequent transitions:

```typescript
@Transition({ to: 'sandbox_ready' })
async initSandbox(state: SandboxExampleState, ctx: RunContext<SandboxExampleArgs>) {
  const initResult: ToolResult<SandboxInitResult> = await this.sandboxInit.call({
    containerId: 'my-sandbox',
    imageName: 'node:18',
    containerName: 'my-filesystem-sandbox',
    projectOutPath: ctx.args.outputDir,
    rootPath: 'workspace',
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Sandbox initialized successfully. Container ID: ${initResult.data!.containerId}, Docker ID: ${initResult.data!.dockerId}`,
  });
  this.assignState({ containerId: initResult.data!.containerId });
}
```

Always destroy the sandbox when finished:

```typescript
@Transition({ from: 'file_deleted', to: 'end' })
async destroySandbox(state: SandboxExampleState) {
  const destroyResult: ToolResult<SandboxDestroyResult> = await this.sandboxDestroy.call({
    containerId: state.containerId!,
    removeContainer: true,
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Sandbox destroyed. Container ${destroyResult.data!.containerId} removed=${destroyResult.data!.removed}`,
  });
}
```

### Filesystem Operations

Perform various file operations within the sandbox, referencing `state.containerId` for the container ID and using `this.assignState(...)` to publish updates:

```typescript
@Transition({ from: 'dir_created', to: 'file_written' })
async writeFile(state: SandboxExampleState) {
  const writeResult: ToolResult<SandboxWriteFileResult> = await this.sandboxWriteFile.call({
    containerId: state.containerId!,
    path: '/workspace/result.txt',
    content: 'Hello from sandbox!',
    encoding: 'utf8',
    createParentDirs: true,
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `File written: ${writeResult.data!.path} (${writeResult.data!.bytesWritten} bytes)`,
  });
}

@Transition({ from: 'file_written', to: 'file_read' })
async readFile(state: SandboxExampleState) {
  const readResult: ToolResult<SandboxReadFileResult> = await this.sandboxReadFile.call({
    containerId: state.containerId!,
    path: '/workspace/result.txt',
    encoding: 'utf8',
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `File read successfully. Content: "${readResult.data!.content}" (encoding: ${readResult.data!.encoding})`,
  });
  this.assignState({ fileContent: readResult.data!.content });
}

@Transition({ from: 'file_read', to: 'dir_listed' })
async listDir(state: SandboxExampleState) {
  const listResult: ToolResult<SandboxListDirectoryResult> = await this.sandboxListDirectory.call({
    containerId: state.containerId!,
    path: '/workspace',
    recursive: false,
  });

  await this.documentStore.save(MessageDocument, {
    role: 'assistant',
    text: `Directory listing for ${listResult.data!.path}: ${this.formatEntries(listResult.data!.entries)}`,
  });
  this.assignState({ fileList: listResult.data!.entries });
}
```

## Workflow Steps

This example workflow demonstrates the following sequence:

1. **initSandbox** - Initialize a Docker container with Node.js 18
2. **createDir** - Create the `/workspace` directory
3. **writeFile** - Write a text file to the workspace
4. **readFile** - Read the file contents back
5. **listDir** - List the directory contents
6. **checkExists** - Verify the file exists
7. **getInfo** - Get detailed file metadata
8. **deleteFile** - Delete the file
9. **destroySandbox** - Clean up the container

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core workflow/runtime APIs (`BaseWorkflow`, `@Workflow`, `@Transition`, `ToolResult`, `MessageDocument`)
- `@loopstack/sandbox-tool` - Provides `SandboxInit` and `SandboxDestroy` tools for container lifecycle
- `@loopstack/sandbox-filesystem` - Provides filesystem tools (`SandboxWriteFile`, `SandboxReadFile`, `SandboxListDirectory`, `SandboxCreateDirectory`, `SandboxDelete`, `SandboxExists`, `SandboxFileInfo`)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
