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

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow class declares inputs, state properties, tools, and a helper method:

```typescript
@Workflow({
  uiConfig: __dirname + '/sandbox-example.ui.yaml',
  schema: z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
})
export class SandboxExampleWorkflow extends BaseWorkflow<{ outputDir: string }> {
  containerId?: string;
  fileContent?: string;
  fileList?: FileEntry[];

  @InjectTool() sandboxInit: SandboxInit;
  @InjectTool() sandboxDestroy: SandboxDestroy;
  @InjectTool() sandboxWriteFile: SandboxWriteFile;
  @InjectTool() sandboxReadFile: SandboxReadFile;
  @InjectTool() sandboxListDirectory: SandboxListDirectory;
  @InjectTool() sandboxCreateDirectory: SandboxCreateDirectory;
  @InjectTool() sandboxDelete: SandboxDelete;
  @InjectTool() sandboxExists: SandboxExists;
  @InjectTool() sandboxFileInfo: SandboxFileInfo;
  @InjectTool() createChatMessage: CreateChatMessage;

  private formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) return '(empty)';
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
```

### Sandbox Lifecycle

Initialize a Docker container before performing filesystem operations. The container ID is saved to a class property for use in subsequent transitions:

```typescript
@Initial({ to: 'sandbox_ready' })
async initSandbox(args: { outputDir: string }) {
  const initResult: ToolResult<SandboxInitResult> = await this.sandboxInit.call({
    containerId: 'my-sandbox',
    imageName: 'node:18',
    containerName: 'my-filesystem-sandbox',
    projectOutPath: args.outputDir,
    rootPath: 'workspace',
  });

  this.containerId = initResult.data!.containerId;

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Sandbox initialized successfully. Container ID: ${initResult.data!.containerId}, Docker ID: ${initResult.data!.dockerId}`,
  });
}
```

Always destroy the sandbox when finished:

```typescript
@Final({ from: 'file_deleted' })
async destroySandbox() {
  const destroyResult: ToolResult<SandboxDestroyResult> = await this.sandboxDestroy.call({
    containerId: this.containerId!,
    removeContainer: true,
  });

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Sandbox destroyed. Container ${destroyResult.data!.containerId} removed=${destroyResult.data!.removed}`,
  });
}
```

### Filesystem Operations

Perform various file operations within the sandbox, referencing `this.containerId` for the container ID and storing results on class properties:

```typescript
@Transition({ from: 'dir_created', to: 'file_written' })
async writeFile() {
  const writeResult: ToolResult<SandboxWriteFileResult> = await this.sandboxWriteFile.call({
    containerId: this.containerId!,
    path: '/workspace/result.txt',
    content: 'Hello from sandbox!',
    encoding: 'utf8',
    createParentDirs: true,
  });

  await this.createChatMessage.call({
    role: 'assistant',
    content: `File written: ${writeResult.data!.path} (${writeResult.data!.bytesWritten} bytes)`,
  });
}

@Transition({ from: 'file_written', to: 'file_read' })
async readFile() {
  const readResult: ToolResult<SandboxReadFileResult> = await this.sandboxReadFile.call({
    containerId: this.containerId!,
    path: '/workspace/result.txt',
    encoding: 'utf8',
  });

  this.fileContent = readResult.data!.content;

  await this.createChatMessage.call({
    role: 'assistant',
    content: `File read successfully. Content: "${readResult.data!.content}" (encoding: ${readResult.data!.encoding})`,
  });
}

@Transition({ from: 'file_read', to: 'dir_listed' })
async listDir() {
  const listResult: ToolResult<SandboxListDirectoryResult> = await this.sandboxListDirectory.call({
    containerId: this.containerId!,
    path: '/workspace',
    recursive: false,
  });

  this.fileList = listResult.data!.entries;

  await this.createChatMessage.call({
    role: 'assistant',
    content: `Directory listing for ${listResult.data!.path}: ${this.formatEntries(listResult.data!.entries)}`,
  });
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

- `@loopstack/common` - Core framework decorators (`BaseWorkflow`, `@Workflow`, `@Initial`, `@Transition`, `@Final`, `@InjectTool`, `ToolResult`)
- `@loopstack/sandbox-tool` - Provides `SandboxInit` and `SandboxDestroy` tools for container lifecycle
- `@loopstack/sandbox-filesystem` - Provides filesystem tools (`SandboxWriteFile`, `SandboxReadFile`, `SandboxListDirectory`, `SandboxCreateDirectory`, `SandboxDelete`, `SandboxExists`, `SandboxFileInfo`)
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool for output

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
