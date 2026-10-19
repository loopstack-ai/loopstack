---
title: 'API: @loopstack/git'
description: 'Public API reference for @loopstack/git'
includeInLlmsFullTxt: false
---

# API: @loopstack/git

## Classes

### GitAddTool

Tool that stages files for the next git commit.

```ts
import { GitAddTool } from '@loopstack/git';
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
import { GitBranchTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitBranchTool extends BaseTool<GitDirArgs, object, GitBranchResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitDirArgs): Promise<ToolEnvelope<GitBranchResult>>;
}
```

### GitCheckoutStateTool

Tool that reads what state a checkout is in before something is done to it.

`git_status` answers what changed; this answers whether the checkout is in a fit state to act on: is a
rebase still open, is the tree clean, did anything keep its conflict markers, and — with a `baseRef` — is
the work built on that base and how far beyond it. It is the read to make after handing a checkout to
someone else, where what you need is not a diff but a verdict.

```ts
import { GitCheckoutStateTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitCheckoutStateTool extends BaseTool<GitCheckoutStateArgs, object, GitCheckoutStateResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitCheckoutStateArgs): Promise<ToolEnvelope<GitCheckoutStateResult>>;
}
```

### GitCheckoutTool

Tool that switches to a different git branch, optionally creating it.

```ts
import { GitCheckoutTool } from '@loopstack/git';
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
import { GitCommitTool } from '@loopstack/git';
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
import { GitConfigUserTool } from '@loopstack/git';
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
import { GitDiffTool } from '@loopstack/git';
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
import { GitFetchTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitFetchTool extends BaseTool<GitFetchArgs, GitToolConfig, GitFetchResult> {
  constructor(env: EnvironmentService, remote: RemoteClient, tokens: GitTokenService);
  protected handle(
    args: GitFetchArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitToolConfig>,
  ): Promise<ToolEnvelope<GitFetchResult>>;
}
```

### GitLogTool

Tool that returns the git commit log for the workspace repository.

```ts
import { GitLogTool } from '@loopstack/git';
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
diff, fetch, checkout, branch, remote/user config, worktree operations), the operations that take several
git commands (squash, rebase, checkout state) and the `GitController` REST API.

Registration:

- `GitModule` — bare import; registers all git tools and the REST controller unconditionally.
- `GitModule.forFeature({ enabled?: boolean; environments?: string[] })` — use to feature-gate the module
  so its tools are only active when enabled and/or limited to specific environments.
- `GitModule.forRoot({ tokenEnv | tokenSecret | oauthProvider })` — the same tools, with a default source
  for the credential `git_push`, `git_pull` and `git_fetch` authenticate with. A single call overrides it
  through its config.

Requires: `RemoteClientModule` must be available in the DI container — every git tool delegates to a remote
agent via `RemoteClient`, so the git commands run on the repository host.

```ts
import { GitModule } from '@loopstack/git';
```

```ts
export class GitModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule;
  static forRoot(source: GitToolConfig): DynamicModule;
}
```

### GitPullTool

Tool that pulls changes from a remote repository.

```ts
import { GitPullTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitPullTool extends BaseTool<GitPullArgs, GitToolConfig, GitPullResult> {
  constructor(env: EnvironmentService, remote: RemoteClient, tokens: GitTokenService);
  protected handle(
    args: GitPullArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitToolConfig>,
  ): Promise<ToolEnvelope<GitPullResult>>;
}
```

### GitPushTool

Tool that pushes commits to a remote repository.

```ts
import { GitPushTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitPushTool extends BaseTool<GitPushArgs, GitToolConfig, GitPushResult> {
  constructor(env: EnvironmentService, remote: RemoteClient, tokens: GitTokenService);
  protected handle(
    args: GitPushArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitToolConfig>,
  ): Promise<ToolEnvelope<GitPushResult>>;
}
```

### GitRebaseTool

Tool that rebases the current branch onto another ref.

There are three outcomes and they are told apart on purpose. A rebase that finishes answers `clean`. A
rebase that stops on conflicting files answers those files and **leaves the rebase in progress**, so an
agent or a person can resolve them and run `git rebase --continue` in the same checkout. A rebase that
fails for any other reason is aborted here — leaving no half-finished state behind — and reported as an
error with git's own output, because nobody can act on it.

```ts
import { GitRebaseTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitRebaseTool extends BaseTool<GitRebaseArgs, object, GitRebaseResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitRebaseArgs): Promise<ToolEnvelope<GitRebaseResult>>;
}
```

### GitRemoteConfigureTool

Tool that configures a git remote, adding it if absent or updating its URL.

```ts
import { GitRemoteConfigureTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitRemoteConfigureTool extends BaseTool<GitRemoteConfigureArgs, object, GitRemoteConfigureResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitRemoteConfigureArgs): Promise<ToolEnvelope<GitRemoteConfigureResult>>;
}
```

### GitSquashTool

Tool that replaces everything the branch added since `baseRef` with a single commit.

The commits are reset into the index and committed again, so the tree is untouched and only the history
changes. The commit is made under the repository's configured identity — set it with `git_config_user`
first — and the message is taken verbatim, so a trailer such as `Closes #12` survives. A branch whose net
change is nothing still becomes a commit, which keeps "the branch landed" true either way.

```ts
import { GitSquashTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitSquashTool extends BaseTool<GitSquashArgs, object, GitSquashResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitSquashArgs): Promise<ToolEnvelope<GitSquashResult>>;
}
```

### GitStatusTool

Tool that reports the git status of the workspace: current branch plus staged, modified,
untracked, and deleted files.

```ts
import { GitStatusTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitStatusTool extends BaseTool<GitDirArgs, object, GitStatusResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitDirArgs): Promise<ToolEnvelope<GitStatusResult>>;
}
```

### GitTokenService

Where the git tools get the token they push, pull and fetch with.

A credential is config rather than an argument on purpose. Arguments are the model-facing input of a tool
and are kept in the run trace, so a token passed as one is written to the database; config carries the
name of a source instead, and the value is read here, at the moment of the call, and handed straight to
the remote server, which applies it through a throwaway `GIT_ASKPASS`.

```ts
import { GitTokenService } from '@loopstack/git';
```

```ts
export class GitTokenService {
  constructor(
    config: ConfigService,
    secrets?: SecretService | undefined,
    tokenStore?: OAuthTokenStore | undefined,
    moduleSource?: GitToolConfig | undefined,
  );
  resolve(ctx: RunContext, options?: ToolCallOptions<GitToolConfig>): Promise<string | undefined>;
}
```

### GitWorktreeAddTool

Tool that creates a new git worktree at the given path, optionally checking out or creating a branch.

```ts
import { GitWorktreeAddTool } from '@loopstack/git';
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
import { GitWorktreeListTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitWorktreeListTool extends BaseTool<GitDirArgs, object, GitWorktreeListResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitDirArgs): Promise<ToolEnvelope<GitWorktreeListResult>>;
}
```

### GitWorktreePruneTool

Tool that prunes worktree administrative files for worktrees whose directories no longer exist.

```ts
import { GitWorktreePruneTool } from '@loopstack/git';
```

**Provided by:** `GitModule`

```ts
export class GitWorktreePruneTool extends BaseTool<GitDirArgs, object, GitWorktreePruneResult> {
  constructor(env: EnvironmentService, remote: RemoteClient);
  protected handle(args: GitDirArgs): Promise<ToolEnvelope<GitWorktreePruneResult>>;
}
```

### GitWorktreeRemoveTool

Tool that removes a git worktree at the given path, optionally forcing removal of dirty or locked worktrees.

```ts
import { GitWorktreeRemoveTool } from '@loopstack/git';
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
import { GitAddArgs } from '@loopstack/git';
```

```ts
export type GitAddArgs = {
  files: string[];
  dir?: string;
};
```

### GitAddResult

Result for `GitAddTool`.

```ts
import { GitAddResult } from '@loopstack/git';
```

```ts
export type GitAddResult = {
  success: boolean;
};
```

### GitBranchResult

Result for `GitBranchTool`.

```ts
import { GitBranchResult } from '@loopstack/git';
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
import { GitCheckoutArgs } from '@loopstack/git';
```

```ts
export type GitCheckoutArgs = {
  branch: string;
  create?: boolean;
  dir?: string;
};
```

### GitCheckoutResult

Result for `GitCheckoutTool`.

```ts
import { GitCheckoutResult } from '@loopstack/git';
```

```ts
export type GitCheckoutResult = {
  branch: string;
};
```

### GitCheckoutStateArgs

Args for `GitCheckoutStateTool`: optionally the `baseRef` to measure the checkout against.

```ts
import { GitCheckoutStateArgs } from '@loopstack/git';
```

```ts
export type GitCheckoutStateArgs = {
  baseRef?: string;
  dir?: string;
};
```

### GitCheckoutStateResult

Result for `GitCheckoutStateTool`: what state the checkout is in, and where it stands against `baseRef`.

```ts
import { GitCheckoutStateResult } from '@loopstack/git';
```

```ts
export type GitCheckoutStateResult = {
  branch: string;
  rebaseInProgress: boolean;
  dirty: boolean;
  conflictMarkers: boolean;
  onBase?: boolean;
  commitsAhead?: number;
};
```

### GitCommit

A single commit entry returned by `GitLogTool`.

```ts
import { GitCommit } from '@loopstack/git';
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
import { GitCommitArgs } from '@loopstack/git';
```

```ts
export type GitCommitArgs = {
  message: string;
  authorName?: string;
  authorEmail?: string;
  skipHooks?: boolean;
  dir?: string;
};
```

### GitCommitResult

Result for `GitCommitTool`.

```ts
import { GitCommitResult } from '@loopstack/git';
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
import { GitConfigUserArgs } from '@loopstack/git';
```

```ts
export type GitConfigUserArgs = {
  name: string;
  email: string;
  dir?: string;
};
```

### GitConfigUserResult

Result for `GitConfigUserTool`.

```ts
import { GitConfigUserResult } from '@loopstack/git';
```

```ts
export type GitConfigUserResult = {
  success: boolean;
};
```

### GitDiffArgs

Args for `GitDiffTool`.

```ts
import { GitDiffArgs } from '@loopstack/git';
```

```ts
export type GitDiffArgs = {
  staged?: boolean;
  dir?: string;
};
```

### GitDiffFile

A single changed file entry returned by `GitDiffTool`.

```ts
import { GitDiffFile } from '@loopstack/git';
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
import { GitDiffResult } from '@loopstack/git';
```

```ts
export type GitDiffResult = {
  files: GitDiffFile[];
};
```

### GitDirArgs

Args for the git tools whose only argument is the repository `dir`.

```ts
import { GitDirArgs } from '@loopstack/git';
```

```ts
export type GitDirArgs = {
  dir?: string;
};
```

### GitFetchArgs

Args for `GitFetchTool`.

```ts
import { GitFetchArgs } from '@loopstack/git';
```

```ts
export type GitFetchArgs = {
  remote?: string;
  dir?: string;
};
```

### GitFetchResult

Result for `GitFetchTool`.

```ts
import { GitFetchResult } from '@loopstack/git';
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
import { GitLogArgs } from '@loopstack/git';
```

```ts
export type GitLogArgs = {
  limit?: number;
  dir?: string;
};
```

### GitLogResult

Result for `GitLogTool`.

```ts
import { GitLogResult } from '@loopstack/git';
```

```ts
export type GitLogResult = {
  commits: GitCommit[];
};
```

### GitPullArgs

Args for `GitPullTool`.

```ts
import { GitPullArgs } from '@loopstack/git';
```

```ts
export type GitPullArgs = {
  remote?: string;
  branch?: string;
  dir?: string;
};
```

### GitPullResult

Result for `GitPullTool`.

```ts
import { GitPullResult } from '@loopstack/git';
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
import { GitPushArgs } from '@loopstack/git';
```

```ts
export type GitPushArgs = {
  remote?: string;
  branch?: string;
  force?: boolean;
  dir?: string;
};
```

### GitPushResult

Result for `GitPushTool`.

```ts
import { GitPushResult } from '@loopstack/git';
```

```ts
export type GitPushResult = {
  success: boolean;
  output?: string;
};
```

### GitRebaseArgs

Args for `GitRebaseTool`: the ref to rebase `onto`.

```ts
import { GitRebaseArgs } from '@loopstack/git';
```

```ts
export type GitRebaseArgs = {
  onto: string;
  dir?: string;
};
```

### GitRebaseResult

Result for `GitRebaseTool`: whether the rebase finished, and the unmerged files when it stopped.

```ts
import { GitRebaseResult } from '@loopstack/git';
```

```ts
export type GitRebaseResult = {
  clean: boolean;
  conflicts?: string[];
};
```

### GitRemoteConfigureArgs

Args for `GitRemoteConfigureTool`.

```ts
import { GitRemoteConfigureArgs } from '@loopstack/git';
```

```ts
export type GitRemoteConfigureArgs = {
  url: string;
  dir?: string;
};
```

### GitRemoteConfigureResult

Result for `GitRemoteConfigureTool`.

```ts
import { GitRemoteConfigureResult } from '@loopstack/git';
```

```ts
export type GitRemoteConfigureResult = {
  success: boolean;
};
```

### GitSquashArgs

Args for `GitSquashTool`: the `baseRef` the branch grew from and the `message` the one commit carries.

```ts
import { GitSquashArgs } from '@loopstack/git';
```

```ts
export type GitSquashArgs = {
  baseRef: string;
  message: string;
  skipHooks?: boolean;
  dir?: string;
};
```

### GitSquashResult

Result for `GitSquashTool`: how many commits were squashed, and the message of the commit they became.

```ts
import { GitSquashResult } from '@loopstack/git';
```

```ts
export type GitSquashResult = {
  commits: number;
  message: string;
};
```

### GitStatusResult

Result for `GitStatusTool`.

```ts
import { GitStatusResult } from '@loopstack/git';
```

```ts
export type GitStatusResult = {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
  entries: {
    path: string;
    index: string;
    worktree: string;
  }[];
};
```

### GitToolConfig

Config type for the git tools that need a credential — see `GitToolConfigSchema`.

```ts
import { GitToolConfig } from '@loopstack/git';
```

```ts
export type GitToolConfig = z.infer<typeof GitToolConfigSchema>;
```

### GitWorktree

A single worktree entry returned by `GitWorktreeListTool`.

```ts
import { GitWorktree } from '@loopstack/git';
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
import { GitWorktreeAddArgs } from '@loopstack/git';
```

```ts
export type GitWorktreeAddArgs = z.infer<typeof GitWorktreeAddSchema>;
```

### GitWorktreeAddResult

Result for `GitWorktreeAddTool`.

```ts
import { GitWorktreeAddResult } from '@loopstack/git';
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
import { GitWorktreeListResult } from '@loopstack/git';
```

```ts
export type GitWorktreeListResult = {
  worktrees: GitWorktree[];
};
```

### GitWorktreePruneResult

Result for `GitWorktreePruneTool`.

```ts
import { GitWorktreePruneResult } from '@loopstack/git';
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
import { GitWorktreeRemoveArgs } from '@loopstack/git';
```

```ts
export type GitWorktreeRemoveArgs = z.infer<typeof GitWorktreeRemoveSchema>;
```

### GitWorktreeRemoveResult

Result for `GitWorktreeRemoveTool`.

```ts
import { GitWorktreeRemoveResult } from '@loopstack/git';
```

```ts
export type GitWorktreeRemoveResult = {
  success: boolean;
};
```

## Variables

### GIT_TOKEN_SOURCE

DI token for the default credential source of the git tools, set once with `GitModule.forRoot()`.

```ts
import { GIT_TOKEN_SOURCE } from '@loopstack/git';
```

```ts
GIT_TOKEN_SOURCE = 'GIT_TOKEN_SOURCE';
```

### GitAddResultSchema

Zod schema for `GitAddResult`.

```ts
import { GitAddResultSchema } from '@loopstack/git';
```

```ts
GitAddResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
  },
  z.core.$strict
>;
```

### GitBranchResultSchema

Zod schema for `GitBranchResult`.

```ts
import { GitBranchResultSchema } from '@loopstack/git';
```

```ts
GitBranchResultSchema: z.ZodObject<
  {
    current: z.ZodString;
    branches: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          isCurrent: z.ZodBoolean;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### GitCheckoutResultSchema

Zod schema for `GitCheckoutResult`.

```ts
import { GitCheckoutResultSchema } from '@loopstack/git';
```

```ts
GitCheckoutResultSchema: z.ZodObject<
  {
    branch: z.ZodString;
  },
  z.core.$strict
>;
```

### GitCheckoutStateResultSchema

Zod schema for `GitCheckoutStateResult`.

```ts
import { GitCheckoutStateResultSchema } from '@loopstack/git';
```

```ts
GitCheckoutStateResultSchema: z.ZodObject<
  {
    branch: z.ZodString;
    rebaseInProgress: z.ZodBoolean;
    dirty: z.ZodBoolean;
    conflictMarkers: z.ZodBoolean;
    onBase: z.ZodOptional<z.ZodBoolean>;
    commitsAhead: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$strict
>;
```

### GitCommitResultSchema

Zod schema for `GitCommitResult`.

```ts
import { GitCommitResultSchema } from '@loopstack/git';
```

```ts
GitCommitResultSchema: z.ZodObject<
  {
    hash: z.ZodString;
    message: z.ZodString;
  },
  z.core.$strict
>;
```

### GitConfigUserResultSchema

Zod schema for `GitConfigUserResult`.

```ts
import { GitConfigUserResultSchema } from '@loopstack/git';
```

```ts
GitConfigUserResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
  },
  z.core.$strict
>;
```

### GitDiffResultSchema

Zod schema for `GitDiffResult`.

```ts
import { GitDiffResultSchema } from '@loopstack/git';
```

```ts
GitDiffResultSchema: z.ZodObject<
  {
    files: z.ZodArray<
      z.ZodObject<
        {
          path: z.ZodString;
          status: z.ZodString;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### GitDirArgSchema

The `dir` argument every git tool accepts: the repository it addresses, as a path relative to the workspace
root. A workspace can hold several repositories in one tree, so each call names the one it works on.

```ts
import { GitDirArgSchema } from '@loopstack/git';
```

```ts
GitDirArgSchema: z.ZodOptional<z.ZodString>;
```

### GitFetchResultSchema

Zod schema for `GitFetchResult`.

```ts
import { GitFetchResultSchema } from '@loopstack/git';
```

```ts
GitFetchResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    output: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### GitLogResultSchema

Zod schema for `GitLogResult`.

```ts
import { GitLogResultSchema } from '@loopstack/git';
```

```ts
GitLogResultSchema: z.ZodObject<
  {
    commits: z.ZodArray<
      z.ZodObject<
        {
          hash: z.ZodString;
          shortHash: z.ZodString;
          message: z.ZodString;
          author: z.ZodString;
          date: z.ZodString;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### GitPullResultSchema

Zod schema for `GitPullResult`.

```ts
import { GitPullResultSchema } from '@loopstack/git';
```

```ts
GitPullResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    output: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### GitPushResultSchema

Zod schema for `GitPushResult`.

```ts
import { GitPushResultSchema } from '@loopstack/git';
```

```ts
GitPushResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    output: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### GitRebaseResultSchema

Zod schema for `GitRebaseResult`.

```ts
import { GitRebaseResultSchema } from '@loopstack/git';
```

```ts
GitRebaseResultSchema: z.ZodObject<
  {
    clean: z.ZodBoolean;
    conflicts: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$strict
>;
```

### GitRemoteConfigureResultSchema

Zod schema for `GitRemoteConfigureResult`.

```ts
import { GitRemoteConfigureResultSchema } from '@loopstack/git';
```

```ts
GitRemoteConfigureResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
  },
  z.core.$strict
>;
```

### GitSquashResultSchema

Zod schema for `GitSquashResult`.

```ts
import { GitSquashResultSchema } from '@loopstack/git';
```

```ts
GitSquashResultSchema: z.ZodObject<
  {
    commits: z.ZodNumber;
    message: z.ZodString;
  },
  z.core.$strict
>;
```

### GitStatusResultSchema

Zod schema for `GitStatusResult`.

```ts
import { GitStatusResultSchema } from '@loopstack/git';
```

```ts
GitStatusResultSchema: z.ZodObject<
  {
    branch: z.ZodString;
    staged: z.ZodArray<z.ZodString>;
    modified: z.ZodArray<z.ZodString>;
    untracked: z.ZodArray<z.ZodString>;
    deleted: z.ZodArray<z.ZodString>;
    entries: z.ZodArray<
      z.ZodObject<
        {
          path: z.ZodString;
          index: z.ZodString;
          worktree: z.ZodString;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### GitToolConfigSchema

Where a git tool gets the token for one call. Every field is a **name**, never a token: the name is what
the author knows at the call site, and what is safe to keep in the run trace.

- `tokenEnv` — an environment variable of the machine the app runs on. The right source for a headless app
  running on a personal access token.
- `tokenSecret` — a secret of the workspace the run belongs to. The right source where each workspace
  pushes with its own credential.
- `oauthProvider` — the OAuth provider whose token belongs to the person the run belongs to, such as
  `github`. The right source for an app with people in front of it, where the token says who is acting.

The first one set wins, in that order, and what the module was registered with fills in whatever the call
leaves out. With none of them set the command runs without a credential, which is all a public repository
or an already-authenticated remote needs.

```ts
import { GitToolConfigSchema } from '@loopstack/git';
```

```ts
GitToolConfigSchema: z.ZodObject<
  {
    tokenEnv: z.ZodOptional<z.ZodString>;
    tokenSecret: z.ZodOptional<z.ZodString>;
    oauthProvider: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
```

### GitWorktreeAddResultSchema

Zod schema for `GitWorktreeAddResult`.

```ts
import { GitWorktreeAddResultSchema } from '@loopstack/git';
```

```ts
GitWorktreeAddResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    path: z.ZodString;
    output: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### GitWorktreeAddSchema

Zod schema for `GitWorktreeAddTool` arguments.

```ts
import { GitWorktreeAddSchema } from '@loopstack/git';
```

```ts
GitWorktreeAddSchema: z.ZodObject<
  {
    path: z.ZodString;
    branch: z.ZodOptional<z.ZodString>;
    newBranch: z.ZodOptional<z.ZodBoolean>;
    force: z.ZodOptional<z.ZodBoolean>;
    dir: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### GitWorktreeListResultSchema

Zod schema for `GitWorktreeListResult`.

```ts
import { GitWorktreeListResultSchema } from '@loopstack/git';
```

```ts
GitWorktreeListResultSchema: z.ZodObject<
  {
    worktrees: z.ZodArray<
      z.ZodObject<
        {
          path: z.ZodString;
          head: z.ZodOptional<z.ZodString>;
          branch: z.ZodOptional<z.ZodString>;
          bare: z.ZodBoolean;
          detached: z.ZodBoolean;
          locked: z.ZodOptional<z.ZodString>;
          prunable: z.ZodOptional<z.ZodString>;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
```

### GitWorktreePruneResultSchema

Zod schema for `GitWorktreePruneResult`.

```ts
import { GitWorktreePruneResultSchema } from '@loopstack/git';
```

```ts
GitWorktreePruneResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
    output: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```

### GitWorktreeRemoveResultSchema

Zod schema for `GitWorktreeRemoveResult`.

```ts
import { GitWorktreeRemoveResultSchema } from '@loopstack/git';
```

```ts
GitWorktreeRemoveResultSchema: z.ZodObject<
  {
    success: z.ZodBoolean;
  },
  z.core.$strict
>;
```

### GitWorktreeRemoveSchema

Zod schema for `GitWorktreeRemoveTool` arguments.

```ts
import { GitWorktreeRemoveSchema } from '@loopstack/git';
```

```ts
GitWorktreeRemoveSchema: z.ZodObject<
  {
    path: z.ZodString;
    force: z.ZodOptional<z.ZodBoolean>;
    dir: z.ZodOptional<z.ZodString>;
  },
  z.core.$strict
>;
```
