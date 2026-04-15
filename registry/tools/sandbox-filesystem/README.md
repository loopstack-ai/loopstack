# @loopstack/sandbox-filesystem

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides secure, controlled filesystem operations within Docker sandbox environments for Loopstack workflows.

## Overview

The Sandbox Filesystem module enables workflows to perform file and directory operations in isolated Docker containers. It provides a comprehensive set of tools for reading, writing, listing, and managing files within sandbox environments, ensuring secure execution of filesystem operations.

By using this module, you'll be able to:

- Create, read, update, and delete files within sandbox containers
- List directory contents with recursive options
- Create directories with automatic parent directory creation
- Get detailed file and directory metadata
- Check for file/directory existence
- Handle both text and binary file content using UTF-8 or base64 encoding
- Perform all operations within the security boundary of Docker containers

This module is essential for workflows that need to manipulate files in isolated environments, such as code execution sandboxes, build environments, or secure file processing pipelines.

**Note:** This module requires `@loopstack/sandbox-tool` as a dependency. The Docker sandbox containers must be initialized using `SandboxInit` and destroyed using `SandboxDestroy` from the `@loopstack/sandbox-tool` module. The filesystem tools operate on containers that have been created by the sandbox-tool.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

**Note:** This module requires `@loopstack/sandbox-tool` as a dependency.

## Usage

Inject the tools in your workflow class using the `@InjectTool()` decorator:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import {
  SandboxCreateDirectory,
  SandboxDelete,
  SandboxExists,
  SandboxFileInfo,
  SandboxListDirectory,
  SandboxReadFile,
  SandboxWriteFile,
} from '@loopstack/sandbox-filesystem';
import { SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';

@Workflow({
  uiConfig: __dirname + '/my.ui.yaml',
  schema: z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
})
export class MyWorkflow extends BaseWorkflow<{ outputDir: string }> {
  // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
  @InjectTool() sandboxInit: SandboxInit;
  @InjectTool() sandboxDestroy: SandboxDestroy;

  // Filesystem tools (from @loopstack/sandbox-filesystem)
  @InjectTool() sandboxWriteFile: SandboxWriteFile;
  @InjectTool() sandboxReadFile: SandboxReadFile;
  @InjectTool() sandboxListDirectory: SandboxListDirectory;
  @InjectTool() sandboxCreateDirectory: SandboxCreateDirectory;
  @InjectTool() sandboxDelete: SandboxDelete;
  @InjectTool() sandboxExists: SandboxExists;
  @InjectTool() sandboxFileInfo: SandboxFileInfo;

  containerId?: string;
  fileContent?: string;

  // Initialize the sandbox container (required before filesystem operations)
  @Initial({ to: 'sandbox_ready' })
  async initSandbox(args: { outputDir: string }) {
    const result = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'my-filesystem-sandbox',
      projectOutPath: args.outputDir,
      rootPath: 'workspace',
    });

    this.containerId = result.data!.containerId;
  }

  // Create a directory and write a file
  @Transition({ from: 'sandbox_ready', to: 'file_written' })
  async writeFile() {
    await this.sandboxCreateDirectory.call({
      containerId: this.containerId!,
      path: '/workspace/output',
      recursive: true,
    });

    await this.sandboxWriteFile.call({
      containerId: this.containerId!,
      path: '/workspace/output/result.txt',
      content: 'Hello from sandbox!',
      encoding: 'utf8',
      createParentDirs: true,
    });
  }

  // Read the file back
  @Transition({ from: 'file_written', to: 'file_read' })
  async readFile() {
    const result = await this.sandboxReadFile.call({
      containerId: this.containerId!,
      path: '/workspace/output/result.txt',
      encoding: 'utf8',
    });

    this.fileContent = result.data!.content;
  }

  // List directory, check existence, get info
  @Transition({ from: 'file_read', to: 'inspected' })
  async inspectFiles() {
    await this.sandboxListDirectory.call({
      containerId: this.containerId!,
      path: '/workspace/output',
      recursive: false,
    });

    await this.sandboxExists.call({
      containerId: this.containerId!,
      path: '/workspace/output/result.txt',
    });

    await this.sandboxFileInfo.call({
      containerId: this.containerId!,
      path: '/workspace/output/result.txt',
    });
  }

  // Clean up and destroy the sandbox
  @Final({ from: 'inspected' })
  async cleanup() {
    await this.sandboxDelete.call({
      containerId: this.containerId!,
      path: '/workspace/output/result.txt',
      force: true,
    });

    await this.sandboxDestroy.call({
      containerId: this.containerId!,
      removeContainer: true,
    });
  }
}
```

## About

Author: Tobias Blättermann, Jakob Klippel

License: MIT

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this tool look for `@loopstack/sandbox-filesystem` in the [Loopstack Registry](https://loopstack.ai/registry)
