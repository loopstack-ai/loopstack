---
title: API: @loopstack/sandbox-tool
description: Public API reference for @loopstack/sandbox-tool
includeInLlmsFullTxt: false
---

# API: @loopstack/sandbox-tool

## Classes

### DockerContainerManagerService

Service that manages the lifecycle of Docker sandbox containers — registering configs, ensuring
containers run, executing commands, and stopping/removing them; inject it for direct container
control beyond what the sandbox tools expose.

```ts
import { DockerContainerManagerService } from '@loopstack/sandbox-tool';
```

**Provided by:** `SandboxToolModule`

```ts
export class DockerContainerManagerService implements OnModuleDestroy {
  constructor(docker?: Docker);
  registerContainer(containerId: string, config: ContainerConfig): void;
  unregisterContainer(containerId: string): void;
  getRegisteredContainerIds(): string[];
  ensureContainer(containerId: string): Promise<Docker.Container>;
  executeCommand(options: ExecuteCommandOptions): Promise<CommandExecutionResult>;
  getDockerContainerId(containerId: string): string | undefined;
  getContainerStatus(containerId: string): Promise<{
    registered: boolean;
    exists: boolean;
    running: boolean;
    dockerId?: string;
  }>;
  stopContainer(containerId: string): Promise<void>;
  removeContainer(containerId: string): Promise<void>;
  onModuleDestroy(): Promise<void>;
}
```

### SandboxCommand

Tool that executes a command inside a sandbox container and captures its stdout, stderr, and exit code.

```ts
import { SandboxCommand } from '@loopstack/sandbox-tool';
```

**Provided by:** `SandboxToolModule`

```ts
export class SandboxCommand extends BaseTool<SandboxCommandArgs, object, CommandExecutionResult> {
  protected handle(args: SandboxCommandArgs): Promise<ToolEnvelope<CommandExecutionResult>>;
}
```

### SandboxDestroy

Tool that stops a sandbox container and optionally removes it, then unregisters its config.

```ts
import { SandboxDestroy } from '@loopstack/sandbox-tool';
```

**Provided by:** `SandboxToolModule`

```ts
export class SandboxDestroy extends BaseTool<SandboxDestroyArgs, object, SandboxDestroyResult> {
  protected handle(args: SandboxDestroyArgs): Promise<ToolEnvelope<SandboxDestroyResult>>;
}
```

### SandboxInit

Tool that initializes a new Docker sandbox container from an image and mounts a host directory into it.

```ts
import { SandboxInit } from '@loopstack/sandbox-tool';
```

**Provided by:** `SandboxToolModule`

```ts
export class SandboxInit extends BaseTool<SandboxInitArgs, object, SandboxInitResult> {
  protected handle(args: SandboxInitArgs): Promise<ToolEnvelope<SandboxInitResult>>;
}
```

### SandboxToolModule

NestJS module that provides Docker sandbox tools — initialize, run commands in, and destroy
isolated containers (`SandboxInit`, `SandboxCommand`, `SandboxDestroy`) — plus the
`DockerContainerManagerService` that manages container lifecycle.

Registration:

- `SandboxToolModule` — bare import; registers the sandbox tools and the container manager service.

Requires: a running Docker daemon on the host; no other Loopstack modules.

```ts
import { SandboxToolModule } from '@loopstack/sandbox-tool';
```

```ts
export class SandboxToolModule {}
```

## Interfaces

### CommandExecutionResult

Result of executing a command in a sandbox container: captured stdout/stderr, exit code, and
whether the command timed out.

```ts
import { CommandExecutionResult } from '@loopstack/sandbox-tool';
```

```ts
export interface CommandExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}
```

### ContainerConfig

Config for a sandbox container — the Docker image, container name, and the host directory mounted
into the container at `rootPath`.

```ts
import { ContainerConfig } from '@loopstack/sandbox-tool';
```

```ts
export interface ContainerConfig {
  imageName: string;
  containerName: string;
  projectOutPath: string;
  rootPath: string;
}
```

### SandboxDestroyResult

Result of `SandboxDestroy`.

Reports the affected container id and whether it was removed.

```ts
import { SandboxDestroyResult } from '@loopstack/sandbox-tool';
```

```ts
export interface SandboxDestroyResult {
  containerId: string;
  removed: boolean;
}
```

### SandboxInitResult

Result of `SandboxInit`.

Reports the registered container id and the underlying Docker container id.

```ts
import { SandboxInitResult } from '@loopstack/sandbox-tool';
```

```ts
export interface SandboxInitResult {
  containerId: string;
  dockerId: string;
}
```

## Type Aliases

### SandboxCommandArgs

Args for `SandboxCommand`.

Identifies the target container and the executable to run, with optional args, working directory,
environment variables, and timeout.

```ts
import { SandboxCommandArgs } from '@loopstack/sandbox-tool';
```

```ts
export type SandboxCommandArgs = z.infer<typeof inputSchema>;
```

### SandboxDestroyArgs

Args for `SandboxDestroy`.

Identifies the container to destroy and whether to remove it or merely stop it.

```ts
import { SandboxDestroyArgs } from '@loopstack/sandbox-tool';
```

```ts
export type SandboxDestroyArgs = z.infer<typeof inputSchema>;
```

### SandboxInitArgs

Args for `SandboxInit`.

Specifies the container id, Docker image, container name, and the host path to mount.

```ts
import { SandboxInitArgs } from '@loopstack/sandbox-tool';
```

```ts
export type SandboxInitArgs = z.infer<typeof inputSchema>;
```
