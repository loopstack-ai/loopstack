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

See [SETUP.md](./SETUP.md) for installation and setup instructions.

**Important:** This module requires Docker to be installed and running on your system.

## Usage

Inject the tools in your workflow class using the `@InjectTool()` decorator:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import { SandboxCommand, SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';

@Workflow({
  uiConfig: __dirname + '/my.ui.yaml',
  schema: z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
})
export class MySandboxWorkflow extends BaseWorkflow<{ outputDir: string }> {
  @InjectTool() sandboxInit: SandboxInit;
  @InjectTool() sandboxCommand: SandboxCommand;
  @InjectTool() sandboxDestroy: SandboxDestroy;

  containerId?: string;

  // Initialize a Node.js sandbox
  @Initial({ to: 'sandbox_ready' })
  async createSandbox(args: { outputDir: string }) {
    const result: ToolResult<{ containerId: string; dockerId: string }> = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'my-node-sandbox',
      projectOutPath: args.outputDir,
      rootPath: 'workspace',
    });

    this.containerId = result.data!.containerId;
  }

  // Execute a Node.js command
  @Transition({ from: 'sandbox_ready', to: 'code_executed' })
  async runCode() {
    await this.sandboxCommand.call({
      containerId: this.containerId!,
      executable: 'node',
      args: ['-e', "console.log('Hello from sandbox!')"],
      workingDirectory: '/workspace',
      timeout: 30000,
    });
  }

  // Clean up the sandbox
  @Final({ from: 'code_executed' })
  async cleanup() {
    await this.sandboxDestroy.call({
      containerId: this.containerId!,
      removeContainer: true,
    });
  }
}
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

## About

Author: Tobias Blättermann, Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this tool look for `@loopstack/sandbox-tool` in the [Loopstack Registry](https://loopstack.ai/registry)
