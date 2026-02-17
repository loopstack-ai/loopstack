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
- Use helper functions to format tool output
- Access tool results via the `runtime` object
- Manage workflow state with `@State` and `@Input`

This example is useful for developers building workflows that need to execute code or manipulate files in isolated environments, such as code execution sandboxes, build pipelines, or secure file processing systems.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Workflow Class

The workflow class declares inputs, state, runtime types, tools, and helpers:

```typescript
import { ToolResult } from '@loopstack/common';

@Workflow({
  configFile: __dirname + '/sandbox-example.workflow.yaml',
})
export class SandboxExampleWorkflow {
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
  state: { containerId: string; fileContent: string; fileList: string };

  @Runtime()
  runtime: { tools: Record<string, Record<string, ToolResult<any>>> };

  @InjectTool() sandboxInit: SandboxInit;
  @InjectTool() sandboxDestroy: SandboxDestroy;
  @InjectTool() sandboxWriteFile: SandboxWriteFile;

  // ... other tools

  @DefineHelper()
  formatEntries(entries: FileEntry[]): string {
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
```

### Sandbox Lifecycle

Initialize a Docker container before performing filesystem operations. The `assign` block saves the container ID to workflow state, while `runtime.tools` provides access to the full result for chat messages:

```yaml
- id: init_sandbox
  from: start
  to: sandbox_ready
  call:
    - id: init
      tool: sandboxInit
      args:
        containerId: my-sandbox
        imageName: node:18
        containerName: my-filesystem-sandbox
        projectOutPath: ${{ args.outputDir }}
        rootPath: workspace
      assign:
        containerId: ${{ result.data.containerId }}
    - tool: createChatMessage
      args:
        role: assistant
        content: 'Sandbox initialized. Container ID: {{ runtime.tools.init_sandbox.init.data.containerId }}'
```

Always destroy the sandbox when finished. Note how `state.containerId` references the value saved via `assign`:

```yaml
- id: destroy_sandbox
  from: file_deleted
  to: end
  call:
    - id: destroy
      tool: sandboxDestroy
      args:
        containerId: ${{ state.containerId }}
        removeContainer: true
    - tool: createChatMessage
      args:
        role: assistant
        content: 'Sandbox destroyed. Container {{ runtime.tools.destroy_sandbox.destroy.data.containerId }} removed={{ runtime.tools.destroy_sandbox.destroy.data.removed }}'
```

### Filesystem Operations

Perform various file operations within the sandbox, referencing state for the container ID and runtime for tool results:

```yaml
# Write a file
- id: write_file
  from: dir_created
  to: file_written
  call:
    - id: write
      tool: sandboxWriteFile
      args:
        containerId: ${{ state.containerId }}
        path: /workspace/result.txt
        content: 'Hello from sandbox!'
        encoding: utf8
        createParentDirs: true
    - tool: createChatMessage
      args:
        role: assistant
        content: 'File written: {{ runtime.tools.write_file.write.data.path }} ({{ runtime.tools.write_file.write.data.bytesWritten }} bytes)'

# Read a file
- id: read_file
  from: file_written
  to: file_read
  call:
    - id: read
      tool: sandboxReadFile
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
    - id: list
      tool: sandboxListDirectory
      args:
        containerId: ${{ state.containerId }}
        path: /workspace
        recursive: false
      assign:
        fileList: ${{ result.data.entries }}
    - tool: createChatMessage
      args:
        role: assistant
        content: 'Directory listing: {{ formatEntries runtime.tools.list_dir.list.data.entries }}'
```

## Workflow Steps

This example workflow demonstrates the following sequence:

1. **init_sandbox** - Initialize a Docker container with Node.js 18
2. **create_dir** - Create the `/workspace` directory
3. **write_file** - Write a text file to the workspace
4. **read_file** - Read the file contents back
5. **list_dir** - List the directory contents
6. **check_exists** - Verify the file exists
7. **get_info** - Get detailed file metadata
8. **delete_file** - Delete the file
9. **destroy_sandbox** - Clean up the container

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/sandbox-tool` - Provides `SandboxInit` and `SandboxDestroy` tools for container lifecycle
- `@loopstack/sandbox-filesystem` - Provides filesystem tools (`SandboxWriteFile`, `SandboxReadFile`, `SandboxListDirectory`, `SandboxCreateDirectory`, `SandboxDelete`, `SandboxExists`, `SandboxFileInfo`)
- `@loopstack/core-ui-module` - Core UI functionality
- `@loopstack/create-chat-message-tool` - Provides `CreateChatMessage` tool for output

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
