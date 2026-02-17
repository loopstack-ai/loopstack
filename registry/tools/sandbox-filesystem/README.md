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

Inject the tools in your workflow class using the @InjectTool() decorator:

```typescript
import { z } from 'zod';
import { InjectTool, Input, State, Workflow } from '@loopstack/common';
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
  configFile: __dirname + '/my.workflow.yaml',
})
export class MyWorkflow {
  @Input({
    schema: z.object({
      outputDir: z.string().default(process.cwd() + '/out'),
    }),
  })
  args: { outputDir: string };

  @State({
    schema: z.object({
      containerId: z.string().optional(),
      fileContent: z.string().optional(),
      fileList: z.array(z.any()).optional(),
    }),
  })
  state: { containerId: string; fileContent: string; fileList: any[] };

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
          projectOutPath: ${{ args.outputDir }}
          rootPath: workspace
        assign:
          containerId: ${{ result.data.containerId }}

  # Create a directory
  - id: create_dir
    from: sandbox_ready
    to: dir_created
    call:
      - tool: sandboxCreateDirectory
        args:
          containerId: ${{ state.containerId }}
          path: /workspace
          recursive: true

  # Write a file
  - id: write_file
    from: dir_created
    to: file_written
    call:
      - tool: sandboxWriteFile
        args:
          containerId: ${{ state.containerId }}
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
          containerId: ${{ state.containerId }}
          path: /workspace/result.txt
          encoding: utf8
        assign:
          fileContent: ${{ result.data.content }}

  # List directory contents
  - id: list_dir
    from: file_read
    to: dir_listed
    call:
      - tool: sandboxListDirectory
        args:
          containerId: ${{ state.containerId }}
          path: /workspace
          recursive: false
        assign:
          fileList: ${{ result.data.entries }}

  # Check file existence
  - id: check_exists
    from: dir_listed
    to: existence_checked
    call:
      - tool: sandboxExists
        args:
          containerId: ${{ state.containerId }}
          path: /workspace/result.txt

  # Get file info
  - id: get_info
    from: existence_checked
    to: info_retrieved
    call:
      - tool: sandboxFileInfo
        args:
          containerId: ${{ state.containerId }}
          path: /workspace/result.txt

  # Delete the file
  - id: delete_file
    from: info_retrieved
    to: file_deleted
    call:
      - tool: sandboxDelete
        args:
          containerId: ${{ state.containerId }}
          path: /workspace/result.txt
          force: true

  # Destroy the sandbox container (cleanup)
  - id: destroy_sandbox
    from: file_deleted
    to: end
    call:
      - tool: sandboxDestroy
        args:
          containerId: ${{ state.containerId }}
          removeContainer: true
```

## About

Author: Tobias Blättermann, Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai)
- [Getting Started with Loopstack](https://loopstack.ai)
- For more examples how to use this tool look for `@loopstack/sandbox-filesystem` in the [Loopstack Registry](https://loopstack.ai/registry)
