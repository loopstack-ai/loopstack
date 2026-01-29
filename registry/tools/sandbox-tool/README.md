# @loopstack/sandbox-tool

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides isolated Docker-based execution environments for running untrusted or experimental code safely within Loopstack workflows.

## Overview

The Sandbox Tool enables workflows to execute code in isolated Docker containers with full control over the runtime environment. It manages container lifecycle, executes commands, and provides safe isolation for running untrusted code or performing system operations without affecting the host system.

By using this tool, you'll be able to:

- Execute code in isolated Docker containers with customizable images
- Run commands safely in sandboxed environments (Node.js, Python, etc.)
- Manage container lifecycle (create, execute, destroy)

This tool is essential for workflows that need to run untrusted code, perform system operations in isolation, or execute commands in specific runtime environments without affecting the host system.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

**Important:** This module requires Docker to be installed and running on your system. The Loopstack application must have access to the Docker daemon (typically via `/var/run/docker.sock`).

### a) Add Sources via `loopstack add`

```bash
loopstack add @loopstack/sandbox-tool
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`(recommended)

```bash
npm install --save @loopstack/sandbox-tool
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `SandboxToolModule` to the imports of `default.module.ts` or any other custom module.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

### 2. Use in Your Workflow

Inject the tools in your workflow class using the @Tool() decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { SandboxCommand, SandboxDestroy, SandboxInit } from './sandbox-tool';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
@WithState(
  z.object({
    containerId: z.string().optional(),
    result: z.any().optional(),
  }),
)
export class MyWorkflow extends WorkflowBase {
  @Tool() sandboxInit: SandboxInit;
  @Tool() sandboxCommand: SandboxCommand;
  @Tool() sandboxDestroy: SandboxDestroy;
}
```

And use it in your YAML workflow configuration:

```yaml
# src/my.workflow.yaml
transitions:
  # Initialize a Node.js sandbox
  - id: create_sandbox
    from: start
    to: sandbox_ready
    call:
      - tool: sandboxInit
        args:
          containerId: my-sandbox
          imageName: node:18
          containerName: my-node-sandbox
          projectOutPath: /tmp/workspace
          rootPath: workspace
        assign:
          containerId: ${ result.data.containerId }

  # Execute a Node.js command
  - id: run_code
    from: sandbox_ready
    to: code_executed
    call:
      - tool: sandboxCommand
        args:
          containerId: ${ containerId }
          executable: node
          args:
            - -e
            - "console.log('Hello from sandbox!')"
          workingDirectory: /workspace
          timeout: 30000
        assign:
          result: ${ result.data }

  # Clean up the sandbox
  - id: cleanup
    from: code_executed
    to: end
    call:
      - tool: sandboxDestroy
        args:
          containerId: ${ containerId }
          removeContainer: true
```

## Tool Reference

### SandboxInit

Initialize a new isolated Docker container for code execution.

**Arguments:**

- `containerId` (string): Unique identifier for this container instance
- `imageName` (string): Docker image to use (e.g., 'node:18', 'python:3.11')
- `containerName` (string): Name for the Docker container
- `projectOutPath` (string): Host path to mount into the container
- `rootPath` (string, default: 'workspace'): Path inside container where projectOutPath is mounted

**Returns:**

```typescript
{
  containerId: string;
  dockerId: string;
}
```

### SandboxCommand

Execute a command inside an initialized sandbox container.

**Arguments:**

- `containerId` (string): ID of the registered container
- `executable` (string): Executable to run (e.g., 'npm', 'node', 'python')
- `args` (string[], optional): Arguments to pass to the executable
- `workingDirectory` (string, default: '/'): Working directory for execution
- `envVars` (string[], optional): Environment variables in KEY=VALUE format
- `timeout` (number, default: 30000): Timeout in milliseconds

**Returns:**

```typescript
{
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}
```

### SandboxDestroy

Stop and destroy a sandbox container.

**Arguments:**

- `containerId` (string): ID of the container to destroy
- `removeContainer` (boolean, default: true): Whether to remove the container or just stop it

**Returns:**

```typescript
{
  containerId: string;
  removed: boolean;
}
```

## Complete Example

Here's a complete workflow that executes Python code in an isolated environment:

```yaml
title: 'Python Code Execution Sandbox'

description: Safely execute Python code in an isolated Docker container

transitions:
  - id: init_python_sandbox
    from: start
    to: sandbox_ready
    call:
      - tool: sandboxInit
        args:
          containerId: python-sandbox
          imageName: python:3.11
          containerName: python-executor
          projectOutPath: /tmp/python-workspace
          rootPath: workspace
        assign:
          containerId: ${ result.data.containerId }

  - id: execute_script
    from: sandbox_ready
    to: script_executed
    call:
      - tool: sandboxCommand
        args:
          containerId: ${ containerId }
          executable: python
          args:
            - -c
            - |
              import sys
              print(f"Python version: {sys.version}")
              print("Hello from isolated sandbox!")
          workingDirectory: /workspace
          timeout: 10000
        assign:
          output: ${ result.data }

  - id: cleanup_sandbox
    from: script_executed
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
- For more examples how to use this tool look for `@loopstack/sandbox-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
