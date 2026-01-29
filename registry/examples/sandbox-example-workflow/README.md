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
- Access tool result metadata in chat messages

This example is useful for developers building workflows that need to execute code or manipulate files in isolated environments, such as code execution sandboxes, build pipelines, or secure file processing systems.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/sandbox-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/sandbox-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `SandboxExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `SandboxExampleWorkflow` workflow to your workspace class using the `@Workflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Sandbox Lifecycle

Initialize a Docker container before performing filesystem operations:

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
        projectOutPath: ${ args.outputDir }
        rootPath: workspace
      assign:
        containerId: ${ result.data.containerId }
```

Always destroy the sandbox when finished:

```yaml
- id: destroy_sandbox
  from: file_deleted
  to: end
  call:
    - tool: sandboxDestroy
      args:
        containerId: ${ containerId }
        removeContainer: true
```

### Filesystem Operations

Perform various file operations within the sandbox:

```yaml
# Write a file
- tool: sandboxWriteFile
  args:
    containerId: ${ containerId }
    path: /workspace/result.txt
    content: 'Hello from sandbox!'
    encoding: utf8
    createParentDirs: true

# Read a file
- tool: sandboxReadFile
  args:
    containerId: ${ containerId }
    path: /workspace/result.txt
    encoding: utf8

# List directory contents
- tool: sandboxListDirectory
  args:
    containerId: ${ containerId }
    path: /workspace
    recursive: false
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
