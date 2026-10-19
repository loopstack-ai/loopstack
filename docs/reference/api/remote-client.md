---
title: 'API: @loopstack/remote-client'
description: 'Public API reference for @loopstack/remote-client'
includeInLlmsFullTxt: false
---

# API: @loopstack/remote-client

## Classes

### BashTool

Tool that executes a shell command on the remote instance, streaming its output live into a document
as it runs, and returns the merged output plus the exit code.

```ts
import { BashTool } from '@loopstack/remote-client';
```

**Provided by:** `RemoteClientModule`

```ts
export class BashTool extends BaseTool<BashArgs, object, BashResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: BashArgs, ctx: RunContext): Promise<ToolEnvelope<BashResult>>;
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
  constructor(
    scope: ScopeAccessor,
    repo: Repository<WorkspaceEnvironmentEntity>,
    remote: RemoteClient,
    clientMessages: ClientMessageService,
  );
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
  markRunning(
    workspaceId: string,
    slotId: string,
    data: {
      agentUrl: string;
      remoteEnvironmentId: string;
      type?: string;
      connectionUrl?: string;
      local?: boolean;
    },
  ): Promise<void>;
  markStopped(workspaceId: string, slotId: string): Promise<void>;
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
  startExec(
    connectionUrl: string,
    options: {
      command: string;
      cwd?: string;
      timeout?: number;
    },
  ): Promise<ExecStartResponse>;
  execStatus(connectionUrl: string, id: string): Promise<ExecStatusResponse>;
  readExecLog(connectionUrl: string, id: string, offset: number): Promise<ExecLogChunk>;
  killExec(
    connectionUrl: string,
    id: string,
  ): Promise<{
    ok: boolean;
  }>;
  streamCommand(connectionUrl: string, options: StreamCommandOptions): Promise<StreamCommandResult>;
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
  purgeWorkspace(
    connectionUrl: string,
    workspaceRoot?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }>;
  getFileTree(connectionUrl: string, basePath?: string): Promise<FileTreeNode[]>;
  gitStatus(connectionUrl: string, options?: GitDirOptions): Promise<GitStatusResponse>;
  gitLog(
    connectionUrl: string,
    options?: {
      limit?: number;
    } & GitDirOptions,
  ): Promise<GitLogResponse>;
  gitDiff(
    connectionUrl: string,
    options?: {
      staged?: boolean;
    } & GitDirOptions,
  ): Promise<GitDiffResponse>;
  gitBranches(connectionUrl: string, options?: GitDirOptions): Promise<GitBranchesResponse>;
  gitRemote(connectionUrl: string, options?: GitDirOptions): Promise<GitRemoteResponse | null>;
  gitAdd(
    connectionUrl: string,
    options: {
      files: string[];
    } & GitDirOptions,
  ): Promise<{
    success: boolean;
  }>;
  gitCommit(
    connectionUrl: string,
    options: {
      message: string;
      authorName?: string;
      authorEmail?: string;
      skipHooks?: boolean;
    } & GitDirOptions,
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
    } & GitDirOptions,
  ): Promise<GitCommandResult>;
  gitFetch(
    connectionUrl: string,
    options?: {
      remote?: string;
      token?: string;
    } & GitDirOptions,
  ): Promise<GitCommandResult>;
  gitPull(
    connectionUrl: string,
    options?: {
      remote?: string;
      branch?: string;
      token?: string;
    } & GitDirOptions,
  ): Promise<GitCommandResult>;
  gitClone(
    connectionUrl: string,
    options: {
      url: string;
      branch?: string;
      token?: string;
    } & GitDirOptions,
  ): Promise<GitCommandResult>;
  gitCheckout(
    connectionUrl: string,
    options: {
      branch: string;
      create?: boolean;
    } & GitDirOptions,
  ): Promise<{
    branch: string;
  }>;
  gitBranch(
    connectionUrl: string,
    options: {
      name: string;
    } & GitDirOptions,
  ): Promise<{
    branch: string;
  }>;
  gitRemoveRemote(
    connectionUrl: string,
    options?: {
      name?: string;
    } & GitDirOptions,
  ): Promise<{
    success: boolean;
  }>;
  gitConfigureRemote(
    connectionUrl: string,
    options: {
      url: string;
    } & GitDirOptions,
  ): Promise<{
    success: boolean;
  }>;
  gitConfigUser(
    connectionUrl: string,
    options: {
      name: string;
      email: string;
    } & GitDirOptions,
  ): Promise<{
    success: boolean;
  }>;
  gitWorktreeList(connectionUrl: string, options?: GitDirOptions): Promise<GitWorktreeListResponse>;
  gitWorktreeAdd(
    connectionUrl: string,
    options: {
      path: string;
      branch?: string;
      newBranch?: boolean;
      force?: boolean;
    } & GitDirOptions,
  ): Promise<GitWorktreeAddResponse>;
  gitWorktreeRemove(
    connectionUrl: string,
    options: {
      path: string;
      force?: boolean;
    } & GitDirOptions,
  ): Promise<{
    success: boolean;
  }>;
  gitWorktreePrune(connectionUrl: string, options?: GitDirOptions): Promise<GitCommandResult>;
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
  status?: 'running' | 'stopped';
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
  status?: EnvironmentStatus;
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

### ExecLogChunk

One incremental slice of a streamed command's merged output from `RemoteClient.readExecLog`.

```ts
import { ExecLogChunk } from '@loopstack/remote-client';
```

```ts
export interface ExecLogChunk {
  chunk: string;
  nextOffset: number;
}
```

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

### ExecStartResponse

Response from `RemoteClient.startExec` — the id of the started streamed command.

```ts
import { ExecStartResponse } from '@loopstack/remote-client';
```

```ts
export interface ExecStartResponse {
  id: string;
}
```

### ExecStatusResponse

Status of a streamed command from `RemoteClient.execStatus`.

```ts
import { ExecStatusResponse } from '@loopstack/remote-client';
```

```ts
export interface ExecStatusResponse {
  id: string;
  status: 'running' | 'exited' | 'killed';
  exitCode: number | null;
  killedBySignal: string | null;
  timedOut: boolean;
  bytesWritten: number;
  startedAt: string;
  endedAt: string | null;
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

### GitBranchesResponse

Response from `RemoteClient.gitBranches` — the current branch and every local branch.

```ts
import { GitBranchesResponse } from '@loopstack/remote-client';
```

```ts
export interface GitBranchesResponse {
  current: string;
  branches: {
    name: string;
    isCurrent: boolean;
  }[];
}
```

### GitCommandResult

Outcome of a git command that only reports whether it worked, with git’s output when it has any.

```ts
import { GitCommandResult } from '@loopstack/remote-client';
```

```ts
export interface GitCommandResult {
  success: boolean;
  output?: string;
}
```

### GitCommit

One commit in `RemoteClient.gitLog`.

```ts
import { GitCommit } from '@loopstack/remote-client';
```

```ts
export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}
```

### GitDiffFile

One changed file in `RemoteClient.gitDiff` — its path and status letter.

```ts
import { GitDiffFile } from '@loopstack/remote-client';
```

```ts
export interface GitDiffFile {
  path: string;
  status: string;
}
```

### GitDiffResponse

Response from `RemoteClient.gitDiff` — the changed files.

```ts
import { GitDiffResponse } from '@loopstack/remote-client';
```

```ts
export interface GitDiffResponse {
  files: GitDiffFile[];
}
```

### GitDirOptions

The repository a git call addresses: a path relative to the workspace root. Omitting it addresses the root.
The server validates the path and rejects anything outside the workspace.

```ts
import { GitDirOptions } from '@loopstack/remote-client';
```

```ts
export interface GitDirOptions {
  dir?: string;
}
```

### GitLogResponse

Response from `RemoteClient.gitLog` — the commits, newest first.

```ts
import { GitLogResponse } from '@loopstack/remote-client';
```

```ts
export interface GitLogResponse {
  commits: GitCommit[];
}
```

### GitRemoteResponse

Response from `RemoteClient.gitRemote` — the remote name and its URL.

```ts
import { GitRemoteResponse } from '@loopstack/remote-client';
```

```ts
export interface GitRemoteResponse {
  name: string;
  url: string;
}
```

### GitStatusEntry

One line of `git status --porcelain`: the path and its two status columns.

```ts
import { GitStatusEntry } from '@loopstack/remote-client';
```

```ts
export interface GitStatusEntry {
  path: string;
  index: string;
  worktree: string;
}
```

### GitStatusResponse

Response from `RemoteClient.gitStatus` — the branch, the folded change lists, and `entries`.

```ts
import { GitStatusResponse } from '@loopstack/remote-client';
```

```ts
export interface GitStatusResponse {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
  entries: GitStatusEntry[];
}
```

### GitWorktree

One worktree in `RemoteClient.gitWorktreeList`.

```ts
import { GitWorktree } from '@loopstack/remote-client';
```

```ts
export interface GitWorktree {
  path: string;
  head?: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked?: string;
  prunable?: string;
}
```

### GitWorktreeAddResponse

Response from `RemoteClient.gitWorktreeAdd` — the created worktree’s path.

```ts
import { GitWorktreeAddResponse } from '@loopstack/remote-client';
```

```ts
export interface GitWorktreeAddResponse {
  success: boolean;
  path: string;
  output?: string;
}
```

### GitWorktreeListResponse

Response from `RemoteClient.gitWorktreeList` — every worktree of the repository.

```ts
import { GitWorktreeListResponse } from '@loopstack/remote-client';
```

```ts
export interface GitWorktreeListResponse {
  worktrees: GitWorktree[];
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

### StreamCommandOptions

Options for `RemoteClient.streamCommand` — how to run the command and where to deliver live output.

```ts
import { StreamCommandOptions } from '@loopstack/remote-client';
```

```ts
export interface StreamCommandOptions {
  command: string;
  cwd?: string;
  timeout?: number;
  pollMs?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void | Promise<void>;
}
```

### StreamCommandResult

Terminal outcome of `RemoteClient.streamCommand` — the exit code and the full captured output.

```ts
import { StreamCommandResult } from '@loopstack/remote-client';
```

```ts
export interface StreamCommandResult {
  exitCode: number;
  output: string;
}
```
