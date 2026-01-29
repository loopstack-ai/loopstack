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

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add`

```bash
loopstack add @loopstack/sandbox-filesystem
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`(recommended)

```bash
npm install --save @loopstack/sandbox-filesystem
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `SandboxFilesystemModule` to the imports of `default.module.ts` or any other custom module.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

### 2. Use in Your Workflow

Inject the tools in your workflow class using the @Tool() decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, Tool, WithArguments, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
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

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
@WithArguments(
  z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
)
@WithState(
  z.object({
    containerId: z.string().optional(),
    fileContent: z.string().optional(),
    fileList: z.array(z.any()).optional(),
  }),
)
export class MyWorkflow extends WorkflowBase {
  // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
  @Tool() sandboxInit: SandboxInit;
  @Tool() sandboxDestroy: SandboxDestroy;

  // Filesystem tools (from @loopstack/sandbox-filesystem)
  @Tool() sandboxWriteFile: SandboxWriteFile;
  @Tool() sandboxReadFile: SandboxReadFile;
  @Tool() sandboxListDirectory: SandboxListDirectory;
  @Tool() sandboxCreateDirectory: SandboxCreateDirectory;
  @Tool() sandboxDelete: SandboxDelete;
  @Tool() sandboxExists: SandboxExists;
  @Tool() sandboxFileInfo: SandboxFileInfo;
}
```

And use them in your YAML workflow configuration:

```yaml
# src/my.workflow.yaml
transitions:
  # Initialize the sandbox container (required before filesystem operations)
  - id: init_sandbox
    from: start
    to: sandbox_ready
    call:
      - tool: sandboxInit
        args:
          containerId: my-sandbox
          imageName: node:18
          containerName: my-filesystem-sandbox
          projectOutPath: ${ args.outputDir }
          rootPath: workspace
        assign:
          containerId: ${ result.data.containerId }

  # Create a directory
  - id: create_dir
    from: sandbox_ready
    to: dir_created
    call:
      - tool: sandboxCreateDirectory
        args:
          containerId: ${ containerId }
          path: /workspace
          recursive: true

  # Write a file
  - id: write_file
    from: dir_created
    to: file_written
    call:
      - tool: sandboxWriteFile
        args:
          containerId: ${ containerId }
          path: /workspace/result.txt
          content: 'Hello from sandbox!'
          encoding: utf8
          createParentDirs: true

  # Read the file
  - id: read_file
    from: file_written
    to: file_read
    call:
      - tool: sandboxReadFile
        args:
          containerId: ${ containerId }
          path: /workspace/result.txt
          encoding: utf8
        assign:
          fileContent: ${ result.data.content }

  # List directory contents
  - id: list_dir
    from: file_read
    to: dir_listed
    call:
      - tool: sandboxListDirectory
        args:
          containerId: ${ containerId }
          path: /workspace
          recursive: false
        assign:
          fileList: ${ result.data.entries }

  # Check file existence
  - id: check_exists
    from: dir_listed
    to: existence_checked
    call:
      - tool: sandboxExists
        args:
          containerId: ${ containerId }
          path: /workspace/result.txt

  # Get file info
  - id: get_info
    from: existence_checked
    to: info_retrieved
    call:
      - tool: sandboxFileInfo
        args:
          containerId: ${ containerId }
          path: /workspace/result.txt

  # Delete the file
  - id: delete_file
    from: info_retrieved
    to: file_deleted
    call:
      - tool: sandboxDelete
        args:
          containerId: ${ containerId }
          path: /workspace/result.txt
          force: true

  # Destroy the sandbox container (cleanup)
  - id: destroy_sandbox
    from: file_deleted
    to: end
    call:
      - tool: sandboxDestroy
        args:
          containerId: ${ containerId }
          removeContainer: true
```

## About

Author: Tobias Blättermann, Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai)
- [Getting Started with Loopstack](https://loopstack.ai)
- For more examples how to use this tool look for `@loopstack/sandbox-filesystem` in the [Loopstack Registry](https://loopstack.ai/registry)
