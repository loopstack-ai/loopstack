---
title: API: @loopstack/remote-client
description: Public API reference for @loopstack/remote-client
includeInLlmsFullTxt: false
---

# API: @loopstack/remote-client

## Classes

### BashTool

Tool that executes a shell command on the remote instance and returns its output and exit code.

```ts
import { BashTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class BashTool extends BaseTool<BashArgs, object, BashResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: BashArgs): Promise<ToolEnvelope<BashResult>>;
}
```

### EditTool

Tool that performs an exact string replacement in a file on the remote instance.

```ts
import { EditTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class EditTool extends BaseTool<EditArgs, object, EditResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: EditArgs): Promise<ToolEnvelope<EditResult>>;
}
```

### EnvironmentService

Service that resolves the remote agent URL for the current execution scope (preferring the `sandbox`
slot) and manages a workspace's environment records; inject it in tools and transitions to reach the
right remote server, or to read, replace, and delete a workspace's environments.

```ts
import { EnvironmentService } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class EnvironmentService {
  constructor(scope: ScopeAccessor, repo: Repository<WorkspaceEnvironmentEntity>, remote: RemoteClient);
  getEnvironments(): Promise<WorkspaceEnvironmentContextDto[]>;
  getAgentUrl(slotId?: string): Promise<string>;
  assertReachable(slotId?: string): Promise<string>;
  getEnvironmentsByWorkspace(workspaceId: string): Promise<WorkspaceEnvironmentContextDto[]>;
  getAgentUrlForWorkspace(workspaceId: string, slotId?: string): Promise<string>;
  findByWorkspace(workspaceId: string): Promise<WorkspaceEnvironmentEntity[]>;
  replaceAll(
    workspaceId: string,
    environments: Partial<WorkspaceEnvironmentEntity>[],
  ): Promise<WorkspaceEnvironmentEntity[]>;
  deleteByWorkspace(workspaceId: string): Promise<void>;
}
```

### GlobTool

Tool that finds files on the remote instance by glob pattern.

```ts
import { GlobTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class GlobTool extends BaseTool<GlobArgs, object, GlobResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GlobArgs): Promise<ToolEnvelope<GlobResult>>;
}
```

### GrepTool

Tool that searches file contents on the remote instance by regex pattern.

```ts
import { GrepTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class GrepTool extends BaseTool<GrepArgs, object, GrepResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GrepArgs): Promise<ToolEnvelope<GrepResult>>;
}
```

### LogsTool

Tool that retrieves application logs from the remote instance.

```ts
import { LogsTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class LogsTool extends BaseTool<LogsArgs, object, LogsResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: LogsArgs): Promise<ToolEnvelope<LogsResult>>;
}
```

### ReadTool

Tool that reads a file from the remote instance, optionally limited to a line range.

```ts
import { ReadTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class ReadTool extends BaseTool<ReadArgs, object, ReadResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: ReadArgs): Promise<ToolEnvelope<ReadResult>>;
}
```

### RebuildAppTool

Tool that rebuilds and restarts the app on the remote instance.

```ts
import { RebuildAppTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class RebuildAppTool extends BaseTool<Record<string, never>, object, RebuildAppResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(): Promise<ToolEnvelope<RebuildAppResult>>;
}
```

### RemoteClient

Service that wraps the remote server's HTTP API — file operations, shell execution, app lifecycle,
and git commands; inject it for low-level remote access when the higher-level tools are not enough.

```ts
import { RemoteClient } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class RemoteClient {
  ping(connectionUrl: string): Promise<{
    status: string;
    timestamp: string;
  }>;
  writeFile(connectionUrl: string, path: string, content: string): Promise<void>;
  readFile(connectionUrl: string, path: string, offset?: number, limit?: number): Promise<FileReadResponse>;
  editFile(
    connectionUrl: string,
    path: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean,
  ): Promise<FileEditResponse>;
  executeCommand(connectionUrl: string, command: string, cwd?: string, timeout?: number): Promise<ExecResponse>;
  glob(connectionUrl: string, pattern: string, path?: string): Promise<GlobResponse>;
  grep(
    connectionUrl: string,
    pattern: string,
    path?: string,
    options?: {
      glob?: string;
      type?: string;
      caseInsensitive?: boolean;
    },
  ): Promise<GrepResponse>;
  rebuildApp(connectionUrl: string): Promise<{
    success: boolean;
    message: string;
  }>;
  getLogs(connectionUrl: string, lines?: number, type?: 'out' | 'error' | 'all'): Promise<LogsResponse>;
  setEnvVars(
    connectionUrl: string,
    variables: {
      key: string;
      value: string;
    }[],
  ): Promise<{
    success: boolean;
    count: number;
    restarted: boolean;
  }>;
  resetWorkspace(connectionUrl: string): Promise<{
    success: boolean;
    message: string;
  }>;
  getFileTree(connectionUrl: string, basePath?: string): Promise<FileTreeNode[]>;
  gitStatus(connectionUrl: string): Promise<GitStatusResponse>;
  gitLog(connectionUrl: string, limit?: number): Promise<GitLogResponse>;
  gitDiff(connectionUrl: string, staged?: boolean): Promise<GitDiffResponse>;
  gitBranches(connectionUrl: string): Promise<GitBranchesResponse>;
  gitRemote(connectionUrl: string): Promise<GitRemoteResponse | null>;
  gitAdd(
    connectionUrl: string,
    files: string[],
  ): Promise<{
    success: boolean;
  }>;
  gitCommit(
    connectionUrl: string,
    message: string,
  ): Promise<{
    hash: string;
    message: string;
  }>;
  gitPush(
    connectionUrl: string,
    options?: {
      remote?: string;
      branch?: string;
      force?: boolean;
      token?: string;
    },
  ): Promise<GitCommandResult>;
  gitFetch(connectionUrl: string, remote?: string, token?: string): Promise<GitCommandResult>;
  gitPull(
    connectionUrl: string,
    options?: {
      remote?: string;
      branch?: string;
      token?: string;
    },
  ): Promise<GitCommandResult>;
  gitCheckout(
    connectionUrl: string,
    branch: string,
    create?: boolean,
  ): Promise<{
    branch: string;
  }>;
  gitBranch(
    connectionUrl: string,
    name: string,
  ): Promise<{
    branch: string;
  }>;
  gitRemoveRemote(
    connectionUrl: string,
    name?: string,
  ): Promise<{
    success: boolean;
  }>;
  gitConfigureRemote(
    connectionUrl: string,
    url: string,
  ): Promise<{
    success: boolean;
  }>;
  gitConfigUser(
    connectionUrl: string,
    name: string,
    email: string,
  ): Promise<{
    success: boolean;
  }>;
  gitWorktreeList(connectionUrl: string): Promise<GitWorktreeListResponse>;
  gitWorktreeAdd(
    connectionUrl: string,
    options: {
      path: string;
      branch?: string;
      newBranch?: boolean;
      force?: boolean;
    },
  ): Promise<GitWorktreeAddResponse>;
  gitWorktreeRemove(
    connectionUrl: string,
    options: {
      path: string;
      force?: boolean;
    },
  ): Promise<{
    success: boolean;
  }>;
  gitWorktreePrune(connectionUrl: string): Promise<GitCommandResult>;
}
```

### RemoteClientModule

NestJS module that provides the `RemoteClient` HTTP client, environment
services (`EnvironmentService`, `EnvironmentConfigService`), the
`EnvironmentController`, and the remote workflow tools (`ReadTool`, `WriteTool`,
`EditTool`, `BashTool`, `GlobTool`, `GrepTool`, `RebuildAppTool`,
`ResetWorkspaceTool`, `LogsTool`, `SyncSecretsTool`) for operating on a remote
workspace's filesystem and shell.

Registration:

- `RemoteClientModule` — bare import. Registers the global root with default
  (empty) config; enough when you don't need to declare available environment types.
- `RemoteClientModule.forRoot(options?: RemoteClientModuleOptions)` — use once at
  the app root to set the global config, notably the list of available
  environment types (`options.environments.available`) users can provision.
- `RemoteClientModule.forFeature(options: RemoteClientFeatureOptions)` — use in a
  feature module to register environment slot configurations (`options.slots`)
  scoped to that module; does not re-import the global root.

Requires: a configured TypeORM database connection — the module registers the
`WorkspaceEntity` and `WorkspaceEnvironmentEntity` and co-imports `SecretsModule`.
`forFeature` additionally requires a non-empty `slots` array.

```ts
import { RemoteClientModule } from '@loopstack/remote-client';
```

```ts
export class RemoteClientModule {
  static forRoot(options?: RemoteClientModuleOptions): DynamicModule;
  static forFeature(options: RemoteClientFeatureOptions): DynamicModule;
}
```

### ResetWorkspaceTool

Tool that resets the remote workspace to its initial state, clearing changes, temp files, database, and Redis.

```ts
import { ResetWorkspaceTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class ResetWorkspaceTool extends BaseTool<Record<string, never>, object, ResetWorkspaceResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(): Promise<ToolEnvelope<ResetWorkspaceResult>>;
}
```

### SyncSecretsTool

Tool that syncs all workspace secrets to the remote environment as `.env` variables and restarts the app.

```ts
import { SyncSecretsTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class SyncSecretsTool extends BaseTool<SyncSecretsInput, object, SyncSecretsResult> {
  constructor(env: EnvironmentService, remote: RemoteClient, secretService: SecretService);
  protected handle(_args: SyncSecretsInput, ctx: RunContext): Promise<ToolEnvelope<SyncSecretsResult>>;
}
```

### WorkspaceEnvironmentContextDto

Result describing a workspace environment in execution context — slot, type, and the resolved
connection and agent URLs returned by `EnvironmentService`.

```ts
import { WorkspaceEnvironmentContextDto } from '@loopstack/remote-client';
```

```ts
export class WorkspaceEnvironmentContextDto {
  slotId: string;
  type: string;
  envName?: string;
  connectionUrl?: string;
  agentUrl?: string;
  workerId?: string;
  workerUrl?: string;
  static fromEntities(entities: WorkspaceEnvironmentEntity[]): WorkspaceEnvironmentContextDto[];
}
```

### WorkspaceEnvironmentDto

Result representing a persisted workspace environment — slot, type, remote environment id, and the
connection and agent URLs used to reach it.

```ts
import { WorkspaceEnvironmentDto } from '@loopstack/remote-client';
```

```ts
export class WorkspaceEnvironmentDto implements WorkspaceEnvironmentInterface {
  slotId: string;
  type: string;
  remoteEnvironmentId: string;
  envName?: string;
  connectionUrl?: string;
  agentUrl?: string;
  workerId?: string;
  workerUrl?: string;
  local?: boolean;
  static create(entity: WorkspaceEnvironmentEntity): WorkspaceEnvironmentDto;
}
```

### WriteTool

Tool that writes a file on the remote instance, creating parent directories and overwriting existing files.

```ts
import { WriteTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class WriteTool extends BaseTool<WriteArgs, object, WriteResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: WriteArgs): Promise<ToolEnvelope<WriteResult>>;
}
```

## Interfaces

### ExecResponse

Response from `RemoteClient.executeCommand` — stdout, stderr, and the process exit code.

```ts
import { ExecResponse } from '@loopstack/remote-client';
```

```ts
export interface ExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### FileEditResponse

Response from `RemoteClient.editFile` — success flag, path, and the number of replacements made.

```ts
import { FileEditResponse } from '@loopstack/remote-client';
```

```ts
export interface FileEditResponse {
  success: boolean;
  path: string;
  replacements: number;
}
```

### FileReadResponse

Response from `RemoteClient.readFile` — the file `content`.

```ts
import { FileReadResponse } from '@loopstack/remote-client';
```

```ts
export interface FileReadResponse {
  content: string;
}
```

### GlobResponse

Response from `RemoteClient.glob` — the matched file paths.

```ts
import { GlobResponse } from '@loopstack/remote-client';
```

```ts
export interface GlobResponse {
  files: string[];
}
```

### GrepMatch

A single `RemoteClient.grep` match — the file, line number, and matching line content.

```ts
import { GrepMatch } from '@loopstack/remote-client';
```

```ts
export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}
```

### GrepResponse

Response from `RemoteClient.grep` — the list of matches.

```ts
import { GrepResponse } from '@loopstack/remote-client';
```

```ts
export interface GrepResponse {
  matches: GrepMatch[];
}
```

### RemoteClientFeatureOptions

Options for `RemoteClientModule.forFeature` — the environment `slots` a feature module contributes.

```ts
import { RemoteClientFeatureOptions } from '@loopstack/remote-client';
```

```ts
export interface RemoteClientFeatureOptions {
  slots: EnvironmentConfigInterface[];
}
```

### RemoteClientModuleOptions

Options for `RemoteClientModule.forRoot` — the list of environment types users can provision via
`environments.available`.

```ts
import { RemoteClientModuleOptions } from '@loopstack/remote-client';
```

```ts
export interface RemoteClientModuleOptions {
  environments?: {
    available?: AvailableEnvironmentInterface[];
  };
}
```
