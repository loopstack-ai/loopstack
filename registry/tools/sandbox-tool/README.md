---
title: Sandbox Tool
description: Docker sandbox tool for Loopstack — SandboxToolModule, SandboxInit, SandboxCommand, SandboxDestroy tools, DockerContainerManagerService. Create isolated Docker containers, execute commands, manage container lifecycle in workflows.
---

# @loopstack/sandbox-tool

> Sandbox execution module for the [Loopstack](https://loopstack.ai) automation framework.

Provides isolated Docker-based execution environments for running untrusted or experimental code safely within Loopstack workflows. It manages container lifecycle (create, execute, destroy) and mounts host directories into containers for file exchange.

## When to Use

- You need to run untrusted or AI-generated code in a sandboxed environment
- Your workflow requires executing commands in specific runtime environments (Node.js, Python, etc.) without affecting the host
- You want disposable containers that are created, used, and destroyed within a single workflow run
- Pair with [`@loopstack/sandbox-filesystem`](https://loopstack.ai/docs/registry/tools/sandbox-filesystem) when you also need file read/write operations inside the container

## Installation

```bash
npm install @loopstack/sandbox-tool
```

**Prerequisite:** Docker must be installed and running on the host system.

Register the module in your NestJS module:

```typescript
import { Module } from '@nestjs/common';
import { SandboxToolModule } from '@loopstack/sandbox-tool';

@Module({
  imports: [SandboxToolModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow],
})
export class MyModule {}
```

## Quick Start

Inject the tool classes via the constructor, then call them in your transitions:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SandboxCommand, SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';

interface SandboxState {
  containerId?: string;
}

const MySandboxArgsSchema = z.object({
  outputDir: z.string().default(process.cwd() + '/out'),
});
type MySandboxArgs = z.infer<typeof MySandboxArgsSchema>;

@Workflow({
  schema: MySandboxArgsSchema,
})
export class MySandboxWorkflow extends BaseWorkflow<MySandboxArgs> {
  constructor(
    private readonly sandboxInit: SandboxInit,
    private readonly sandboxCommand: SandboxCommand,
    private readonly sandboxDestroy: SandboxDestroy,
  ) {
    super();
  }

  @Transition({ to: 'sandbox_ready' })
  async createSandbox(state: SandboxState, ctx: RunContext<MySandboxArgs>) {
    const result = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'my-node-sandbox',
      projectOutPath: ctx.args.outputDir,
      rootPath: 'workspace',
    });
    this.assignState({ containerId: result.data.containerId });
  }

  @Transition({ from: 'sandbox_ready', to: 'code_executed' })
  async runCode(state: SandboxState) {
    await this.sandboxCommand.call({
      containerId: state.containerId!,
      executable: 'node',
      args: ['-e', "console.log('Hello from sandbox!')"],
      workingDirectory: '/workspace',
      timeout: 30000,
    });
  }

  @Transition({ from: 'code_executed', to: 'end' })
  async cleanup(state: SandboxState) {
    await this.sandboxDestroy.call({
      containerId: state.containerId!,
      removeContainer: true,
    });
  }
}
```

## How It Works

The module manages Docker containers through a three-step lifecycle:

```
sandbox_init  -->  sandbox_command (repeatable)  -->  sandbox_destroy
```

1. **Init** creates (or reuses) a Docker container from a specified image, mounts a host directory, and keeps the container alive with `sleep infinity`. `sandbox_init` is **idempotent** — calling it again with the same `containerId` reuses the existing container instead of creating a duplicate, so workflows don't need to track container state themselves.
2. **Command** executes shell commands inside the running container via `docker exec`. Commands are shell-escaped to prevent injection. `stdout` and `stderr` are captured **separately** on the result. By default, output is trimmed of leading and trailing whitespace. A configurable timeout (default 30s) kills runaway processes — when a timeout fires, the result has `timedOut: true` and `exitCode: -1`, and stdout/stderr contain whatever was emitted before the kill.
3. **Destroy** stops and optionally removes the container, freeing resources.

The `DockerContainerManagerService` handles the underlying Docker operations: image pulling, container creation, volume binding, stream demuxing, and concurrent access serialization via per-container locks. It implements `OnModuleDestroy` to stop all managed containers when the NestJS application shuts down.

### Security

- **Path traversal prevention** — working directories are normalized and checked for `..` sequences
- **Shell argument escaping** — all executable names and arguments are single-quote escaped
- **Isolated containers** — code runs in Docker containers with only the mounted volume accessible
- **Configurable timeouts** — commands that exceed the timeout are killed and return `timedOut: true`

## Tools Reference

### `sandbox_init`

Initialize a new sandbox container.

| Arg              | Type     | Required                  | Description                                                 |
| ---------------- | -------- | ------------------------- | ----------------------------------------------------------- |
| `containerId`    | `string` | Yes                       | Unique identifier for this container instance               |
| `imageName`      | `string` | Yes                       | Docker image to use (e.g., `node:18`, `python:3.11`)        |
| `containerName`  | `string` | Yes                       | Name for the Docker container                               |
| `projectOutPath` | `string` | Yes                       | Host path to mount into the container                       |
| `rootPath`       | `string` | No (default: `workspace`) | Path inside the container where `projectOutPath` is mounted |

**Returns:** `{ containerId: string; dockerId: string }`

### `sandbox_command`

Execute a command inside a running sandbox container.

| Arg                | Type       | Required              | Description                                       |
| ------------------ | ---------- | --------------------- | ------------------------------------------------- |
| `containerId`      | `string`   | Yes                   | ID of the registered container                    |
| `executable`       | `string`   | Yes                   | Executable to run (e.g., `npm`, `node`, `python`) |
| `args`             | `string[]` | No                    | Arguments to pass to the executable               |
| `workingDirectory` | `string`   | No (default: `/`)     | Working directory for execution                   |
| `envVars`          | `string[]` | No                    | Environment variables in `KEY=VALUE` format       |
| `timeout`          | `number`   | No (default: `30000`) | Timeout in milliseconds                           |

**Returns:** `{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }`

### `sandbox_destroy`

Stop and destroy a sandbox container.

| Arg               | Type      | Required             | Description                                     |
| ----------------- | --------- | -------------------- | ----------------------------------------------- |
| `containerId`     | `string`  | Yes                  | ID of the container to destroy                  |
| `removeContainer` | `boolean` | No (default: `true`) | Whether to remove the container or just stop it |

**Returns:** `{ containerId: string; removed: boolean }`

## Public API

**Module**

- `SandboxToolModule` — NestJS module that registers all tools and services

**Tools**

- `SandboxInit` — `@Tool({ name: 'sandbox_init' })` — create and start a container
- `SandboxCommand` — `@Tool({ name: 'sandbox_command' })` — execute a command in a container
- `SandboxDestroy` — `@Tool({ name: 'sandbox_destroy' })` — stop/remove a container

**Services**

- `DockerContainerManagerService` — low-level Docker container management (register, ensure, execute, stop, remove)

**Types**

- `ContainerConfig` — configuration for a registered container
- `CommandExecutionResult` — stdout, stderr, exitCode, timedOut
- `DOCKER_CLIENT` — injection token for providing a custom `Docker` (dockerode) instance

## Dependencies

| Package             | Role                                         |
| ------------------- | -------------------------------------------- |
| `@loopstack/common` | Base tool class, decorators, types           |
| `@nestjs/common`    | NestJS dependency injection                  |
| `zod`               | Schema validation for tool args              |
| `dockerode`         | Docker Engine API client (direct dependency) |

## Related

- [Sandbox Execution docs](https://loopstack.ai/docs/build/integrations/sandbox) — setup guide, available tools across both sandbox packages, and security details
- [@loopstack/sandbox-filesystem](https://loopstack.ai/docs/registry/tools/sandbox-filesystem) — file read/write/delete/list operations inside sandbox containers
- [sandbox-example-workflow](https://loopstack.ai/docs/registry/examples/sandbox-example-workflow) — full sandbox lifecycle example using both `@loopstack/sandbox-tool` and `@loopstack/sandbox-filesystem`

## About

Author: Tobias Blattermann, Jakob Klippel

License: MIT
