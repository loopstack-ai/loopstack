---
title: API: @loopstack/git-module
description: Public API reference for @loopstack/git-module
includeInLlmsFullTxt: false
---

# API: @loopstack/git-module

## Classes

### GitAddTool

Tool that stages files for the next git commit.

```ts
import { GitAddTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitAddTool extends BaseTool<GitAddArgs, object, GitAddResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitAddArgs): Promise<ToolEnvelope<GitAddResult>>;
}
```

### GitBranchTool

Tool that lists all local git branches and indicates the current branch.

```ts
import { GitBranchTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitBranchTool extends BaseTool<object, object, GitBranchResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(): Promise<ToolEnvelope<GitBranchResult>>;
}
```

### GitCheckoutTool

Tool that switches to a different git branch, optionally creating it.

```ts
import { GitCheckoutTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitCheckoutTool extends BaseTool<GitCheckoutArgs, object, GitCheckoutResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitCheckoutArgs): Promise<ToolEnvelope<GitCheckoutResult>>;
}
```

### GitCommitTool

Tool that creates a git commit from the currently staged changes.

```ts
import { GitCommitTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitCommitTool extends BaseTool<GitCommitArgs, object, GitCommitResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitCommitArgs): Promise<ToolEnvelope<GitCommitResult>>;
}
```

### GitConfigUserTool

Tool that configures git `user.name` and `user.email` for the workspace repository.

```ts
import { GitConfigUserTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitConfigUserTool extends BaseTool<GitConfigUserArgs, object, GitConfigUserResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitConfigUserArgs): Promise<ToolEnvelope<GitConfigUserResult>>;
}
```

### GitDiffTool

Tool that lists changed files in the workspace with their change status.

```ts
import { GitDiffTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitDiffTool extends BaseTool<GitDiffArgs, object, GitDiffResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitDiffArgs): Promise<ToolEnvelope<GitDiffResult>>;
}
```

### GitFetchTool

Tool that fetches refs and objects from a remote repository without merging.

```ts
import { GitFetchTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitFetchTool extends BaseTool<GitFetchArgs, object, GitFetchResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitFetchArgs): Promise<ToolEnvelope<GitFetchResult>>;
}
```

### GitLogTool

Tool that returns the git commit log for the workspace repository.

```ts
import { GitLogTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitLogTool extends BaseTool<GitLogArgs, object, GitLogResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitLogArgs): Promise<ToolEnvelope<GitLogResult>>;
}
```

### GitModule

NestJS module that provides the git version control tools (status, add, commit, push, pull, log,
diff, fetch, checkout, branch, remote/user config, worktree operations) and the `GitController` REST API.

Registration:

- `GitModule` — bare import; registers all git tools and the REST controller unconditionally.
- `GitModule.forFeature({ enabled?: boolean; environments?: string[] })` — use to feature-gate the module
  so its tools are only active when enabled and/or limited to specific environments.

Requires: `RemoteClientModule` must be available in the DI container — every git tool delegates to a remote
agent via `RemoteClient`, so the git commands run on the repository host.

```ts
import { GitModule } from '@loopstack/git-module';
```

```ts
export class GitModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule;
}
```

### GitPullTool

Tool that pulls changes from a remote repository.

```ts
import { GitPullTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitPullTool extends BaseTool<GitPullArgs, object, GitPullResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitPullArgs): Promise<ToolEnvelope<GitPullResult>>;
}
```

### GitPushTool

Tool that pushes commits to a remote repository.

```ts
import { GitPushTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitPushTool extends BaseTool<GitPushArgs, object, GitPushResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitPushArgs): Promise<ToolEnvelope<GitPushResult>>;
}
```

### GitRemoteConfigureTool

Tool that configures a git remote, adding it if absent or updating its URL.

```ts
import { GitRemoteConfigureTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitRemoteConfigureTool extends BaseTool<GitRemoteConfigureArgs, object, GitRemoteConfigureResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitRemoteConfigureArgs): Promise<ToolEnvelope<GitRemoteConfigureResult>>;
}
```

### GitStatusTool

Tool that reports the git status of the workspace: current branch plus staged, modified,
untracked, and deleted files.

```ts
import { GitStatusTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitStatusTool extends BaseTool<object, object, GitStatusResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(): Promise<ToolEnvelope<GitStatusResult>>;
}
```

### GitWorktreeAddTool

Tool that creates a new git worktree at the given path, optionally checking out or creating a branch.

```ts
import { GitWorktreeAddTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitWorktreeAddTool extends BaseTool<GitWorktreeAddArgs, object, GitWorktreeAddResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitWorktreeAddArgs): Promise<ToolEnvelope<GitWorktreeAddResult>>;
}
```

### GitWorktreeListTool

Tool that lists all git worktrees attached to the repository, including path, HEAD, branch, and flags.

```ts
import { GitWorktreeListTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitWorktreeListTool extends BaseTool<object, object, GitWorktreeListResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(): Promise<ToolEnvelope<GitWorktreeListResult>>;
}
```

### GitWorktreePruneTool

Tool that prunes worktree administrative files for worktrees whose directories no longer exist.

```ts
import { GitWorktreePruneTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitWorktreePruneTool extends BaseTool<object, object, GitWorktreePruneResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(): Promise<ToolEnvelope<GitWorktreePruneResult>>;
}
```

### GitWorktreeRemoveTool

Tool that removes a git worktree at the given path, optionally forcing removal of dirty or locked worktrees.

```ts
import { GitWorktreeRemoveTool } from '@loopstack/git-module';
```

**Provided by:** `GitModule`

```ts
export class GitWorktreeRemoveTool extends BaseTool<GitWorktreeRemoveArgs, object, GitWorktreeRemoveResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitWorktreeRemoveArgs): Promise<ToolEnvelope<GitWorktreeRemoveResult>>;
}
```

## Type Aliases

### GitAddArgs

Args for `GitAddTool`.

```ts
import { GitAddArgs } from '@loopstack/git-module';
```

```ts
export type GitAddArgs = {
  files: string[];
};
```

### GitAddResult

Result for `GitAddTool`.

```ts
import { GitAddResult } from '@loopstack/git-module';
```

```ts
export type GitAddResult = {
  success: boolean;
};
```

### GitBranchResult

Result for `GitBranchTool`.

```ts
import { GitBranchResult } from '@loopstack/git-module';
```

```ts
export type GitBranchResult = {
  current: string;
  branches: {
    name: string;
    isCurrent: boolean;
  }[];
};
```

### GitCheckoutArgs

Args for `GitCheckoutTool`.

```ts
import { GitCheckoutArgs } from '@loopstack/git-module';
```

```ts
export type GitCheckoutArgs = {
  branch: string;
  create?: boolean;
};
```

### GitCheckoutResult

Result for `GitCheckoutTool`.

```ts
import { GitCheckoutResult } from '@loopstack/git-module';
```

```ts
export type GitCheckoutResult = {
  branch: string;
};
```

### GitCommit

A single commit entry returned by `GitLogTool`.

```ts
import { GitCommit } from '@loopstack/git-module';
```

```ts
export type GitCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
};
```

### GitCommitArgs

Args for `GitCommitTool`.

```ts
import { GitCommitArgs } from '@loopstack/git-module';
```

```ts
export type GitCommitArgs = {
  message: string;
};
```

### GitCommitResult

Result for `GitCommitTool`.

```ts
import { GitCommitResult } from '@loopstack/git-module';
```

```ts
export type GitCommitResult = {
  hash: string;
  message: string;
};
```

### GitConfigUserArgs

Args for `GitConfigUserTool`.

```ts
import { GitConfigUserArgs } from '@loopstack/git-module';
```

```ts
export type GitConfigUserArgs = {
  name: string;
  email: string;
};
```

### GitConfigUserResult

Result for `GitConfigUserTool`.

```ts
import { GitConfigUserResult } from '@loopstack/git-module';
```

```ts
export type GitConfigUserResult = {
  success: boolean;
};
```

### GitDiffArgs

Args for `GitDiffTool`.

```ts
import { GitDiffArgs } from '@loopstack/git-module';
```

```ts
export type GitDiffArgs = {
  staged?: boolean;
};
```

### GitDiffFile

A single changed file entry returned by `GitDiffTool`.

```ts
import { GitDiffFile } from '@loopstack/git-module';
```

```ts
export type GitDiffFile = {
  path: string;
  status: string;
};
```

### GitDiffResult

Result for `GitDiffTool`.

```ts
import { GitDiffResult } from '@loopstack/git-module';
```

```ts
export type GitDiffResult = {
  files: GitDiffFile[];
};
```

### GitFetchArgs

Args for `GitFetchTool`.

```ts
import { GitFetchArgs } from '@loopstack/git-module';
```

```ts
export type GitFetchArgs = {
  remote?: string;
  token?: string;
};
```

### GitFetchResult

Result for `GitFetchTool`.

```ts
import { GitFetchResult } from '@loopstack/git-module';
```

```ts
export type GitFetchResult = {
  success: boolean;
  output?: string;
};
```

### GitLogArgs

Args for `GitLogTool`.

```ts
import { GitLogArgs } from '@loopstack/git-module';
```

```ts
export type GitLogArgs = {
  limit?: number;
};
```

### GitLogResult

Result for `GitLogTool`.

```ts
import { GitLogResult } from '@loopstack/git-module';
```

```ts
export type GitLogResult = {
  commits: GitCommit[];
};
```

### GitPullArgs

Args for `GitPullTool`.

```ts
import { GitPullArgs } from '@loopstack/git-module';
```

```ts
export type GitPullArgs = {
  remote?: string;
  branch?: string;
  token?: string;
};
```

### GitPullResult

Result for `GitPullTool`.

```ts
import { GitPullResult } from '@loopstack/git-module';
```

```ts
export type GitPullResult = {
  success: boolean;
  output?: string;
};
```

### GitPushArgs

Args for `GitPushTool`.

```ts
import { GitPushArgs } from '@loopstack/git-module';
```

```ts
export type GitPushArgs = {
  remote?: string;
  branch?: string;
  force?: boolean;
  token?: string;
};
```

### GitPushResult

Result for `GitPushTool`.

```ts
import { GitPushResult } from '@loopstack/git-module';
```

```ts
export type GitPushResult = {
  success: boolean;
  output?: string;
};
```

### GitRemoteConfigureArgs

Args for `GitRemoteConfigureTool`.

```ts
import { GitRemoteConfigureArgs } from '@loopstack/git-module';
```

```ts
export type GitRemoteConfigureArgs = {
  url: string;
};
```

### GitRemoteConfigureResult

Result for `GitRemoteConfigureTool`.

```ts
import { GitRemoteConfigureResult } from '@loopstack/git-module';
```

```ts
export type GitRemoteConfigureResult = {
  success: boolean;
};
```

### GitStatusResult

Result for `GitStatusTool`.

```ts
import { GitStatusResult } from '@loopstack/git-module';
```

```ts
export type GitStatusResult = {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
};
```

### GitWorktree

A single worktree entry returned by `GitWorktreeListTool`.

```ts
import { GitWorktree } from '@loopstack/git-module';
```

```ts
export type GitWorktree = {
  path: string;
  head?: string;
  branch?: string;
  bare: boolean;
  detached: boolean;
  locked?: string;
  prunable?: string;
};
```

### GitWorktreeAddArgs

Args for `GitWorktreeAddTool`.

```ts
import { GitWorktreeAddArgs } from '@loopstack/git-module';
```

```ts
export type GitWorktreeAddArgs = z.infer<typeof GitWorktreeAddSchema>;
```

### GitWorktreeAddResult

Result for `GitWorktreeAddTool`.

```ts
import { GitWorktreeAddResult } from '@loopstack/git-module';
```

```ts
export type GitWorktreeAddResult = {
  success: boolean;
  path: string;
  output?: string;
};
```

### GitWorktreeListResult

Result for `GitWorktreeListTool`.

```ts
import { GitWorktreeListResult } from '@loopstack/git-module';
```

```ts
export type GitWorktreeListResult = {
  worktrees: GitWorktree[];
};
```

### GitWorktreePruneResult

Result for `GitWorktreePruneTool`.

```ts
import { GitWorktreePruneResult } from '@loopstack/git-module';
```

```ts
export type GitWorktreePruneResult = {
  success: boolean;
  output?: string;
};
```

### GitWorktreeRemoveArgs

Args for `GitWorktreeRemoveTool`.

```ts
import { GitWorktreeRemoveArgs } from '@loopstack/git-module';
```

```ts
export type GitWorktreeRemoveArgs = z.infer<typeof GitWorktreeRemoveSchema>;
```

### GitWorktreeRemoveResult

Result for `GitWorktreeRemoveTool`.

```ts
import { GitWorktreeRemoveResult } from '@loopstack/git-module';
```

```ts
export type GitWorktreeRemoveResult = {
  success: boolean;
};
```

## Variables

### GitWorktreeAddSchema

Zod schema for `GitWorktreeAddTool` arguments.

```ts
import { GitWorktreeAddSchema } from '@loopstack/git-module';
```

```ts
GitWorktreeAddSchema: z.ZodObject<
  {
    path: z.ZodString;
    branch: z.ZodOptional<z.ZodString>;
    newBranch: z.ZodOptional<z.ZodBoolean>;
    force: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strict
>;
```

### GitWorktreeRemoveSchema

Zod schema for `GitWorktreeRemoveTool` arguments.

```ts
import { GitWorktreeRemoveSchema } from '@loopstack/git-module';
```

```ts
GitWorktreeRemoveSchema: z.ZodObject<
  {
    path: z.ZodString;
    force: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strict
>;
```
