---
title: Git Module
description: Git version control tools for Loopstack workflows — GitStatusTool,
  GitAddTool, GitCommitTool, GitPushTool, GitPullTool, GitLogTool, GitDiffTool,
  GitFetchTool, GitCheckoutTool, GitBranchTool, GitRemoteConfigureTool,
  GitConfigUserTool, GitWorktreeAddTool, GitWorktreeListTool,
  GitWorktreeRemoveTool, GitWorktreePruneTool, GitModule, GitController REST API,
  forFeature configuration, GitSquashTool, GitRebaseTool, GitCheckoutStateTool,
  GitRepositorySource for the repositories of a workspace,
  GitTokenService credentials via tokenEnv, tokenSecret or oauthProvider,
  per-repository dir argument
---

# @loopstack/git

> Git version control module for the [Loopstack](https://loopstack.ai) automation framework.

Provides 19 workflow tools that cover the full git lifecycle -- status, staging, commits, branches, remotes, worktrees, and more. Every tool delegates to a remote agent via `RemoteClient`, so the actual `git` commands run on the machine that hosts the repository, not on the workflow host.

## When to Use

- You need a workflow to inspect, stage, commit, or push changes in a git repository.
- You want to automate branch management (create, checkout, list) as part of a CI or agent workflow.
- You need parallel working directories via git worktrees for concurrent tasks.
- You want REST endpoints for a UI (e.g. the Loopstack Studio diff viewer) to trigger git operations without starting a workflow.

## Installation

```sh
npm install @loopstack/git
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git';

@Module({
  imports: [GitModule],
})
export class AppModule {}
```

`GitModule` depends on `RemoteClientModule` being available in the DI container (typically wired up in your app's root module).

### Feature gating

Use `forFeature()` to restrict the module to specific environments:

```ts
GitModule.forFeature({ enabled: true, environments: ['production'] });
```

### Default credential source

Use `forRoot()` to name where `git_push`, `git_pull` and `git_fetch` read their token from — see
[Credentials](#credentials):

```ts
GitModule.forRoot({ tokenEnv: 'GIT_TOKEN' });
```

## Quick Start

A workflow that checks status, stages all files, commits, and reads back the log:

```ts
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GitAddTool, GitCommitTool, GitLogTool, GitStatusTool } from '@loopstack/git';

@Workflow({ title: 'Git Commit Flow' })
export class CommitWorkflow extends BaseWorkflow {
  constructor(
    private readonly gitStatus: GitStatusTool,
    private readonly gitAdd: GitAddTool,
    private readonly gitCommit: GitCommitTool,
    private readonly gitLog: GitLogTool,
  ) {
    super();
  }

  @Transition({ to: 'staged' })
  async checkAndStage(state: Record<string, unknown>) {
    const status = await this.gitStatus.call();
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Status: ${JSON.stringify(status.data, null, 2)}`,
    });
    await this.gitAdd.call({ files: ['.'] });
  }

  @Transition({ from: 'staged', to: 'end' })
  async commitAndLog(_state: Record<string, unknown>) {
    await this.gitCommit.call({ message: 'chore: automated commit' });
    const log = await this.gitLog.call({ limit: 1 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Committed: ${JSON.stringify(log.data, null, 2)}`,
    });
  }
}
```

Register the workflow alongside `GitModule`:

```ts
import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git';
import { CommitWorkflow } from './commit.workflow';

@Module({
  imports: [GitModule],
  providers: [CommitWorkflow],
  exports: [CommitWorkflow],
})
export class CommitModule {}
```

## Tools Reference

Every tool is a NestJS provider resolved via `@Tool({ name })`. Inject the tool class directly in your workflow constructor.

Every tool takes an optional `dir`: the repository it addresses, as a path relative to the workspace root. A
workspace can hold several repositories in one tree, so each call names the one it works on; omitting `dir`
addresses the root itself.

### Core Operations

#### `git_status`

Gets the git status of the workspace. Returns the current branch, the staged, modified, untracked and deleted files, and each path's two status columns.

| Arg   | Type     | Required | Description                                                               |
| ----- | -------- | -------- | ------------------------------------------------------------------------- |
| `dir` | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ branch: string; staged: string[]; modified: string[]; untracked: string[]; deleted: string[]; entries: { path: string; index: string; worktree: string }[] }`

The lists answer what changed. `entries` keeps git's own two columns per path — `index` is what is staged,
`worktree` what is not, each a space when there is nothing — which is the only way to tell an index change
from a working-tree one. A rename reads `old -> new`, as git prints it.

---

#### `git_add`

Stages files for the next git commit.

| Arg     | Type       | Required | Description                                                               |
| ------- | ---------- | -------- | ------------------------------------------------------------------------- |
| `files` | `string[]` | Yes      | File paths to stage. Use `["."]` to stage all changes.                    |
| `dir`   | `string`   | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean }`

---

#### `git_commit`

Creates a git commit with the currently staged changes.

| Arg           | Type      | Required | Description                                                               |
| ------------- | --------- | -------- | ------------------------------------------------------------------------- |
| `message`     | `string`  | Yes      | The commit message                                                        |
| `authorName`  | `string`  | No       | Author of this commit; goes with `authorEmail`.                           |
| `authorEmail` | `string`  | No       | Author email of this commit; goes with `authorName`.                      |
| `skipHooks`   | `boolean` | No       | Do not run the repository's commit hooks.                                 |
| `dir`         | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ hash: string; message: string }`

An author applies to this commit alone — the repository's own `user.name` and `user.email` are left as they
are — and both halves are given together or not at all. Use `git_config_user` instead when every commit in
that checkout should carry the same identity.

---

#### `git_diff`

Shows changed files in the workspace. Returns file paths and their change status.

| Arg      | Type      | Required | Description                                                               |
| -------- | --------- | -------- | ------------------------------------------------------------------------- |
| `staged` | `boolean` | No       | Show staged changes instead of unstaged                                   |
| `dir`    | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ files: { path: string; status: string }[] }`

---

#### `git_log`

Shows the git commit log for the workspace repository.

| Arg     | Type     | Required | Description                                                               |
| ------- | -------- | -------- | ------------------------------------------------------------------------- |
| `limit` | `number` | No       | Maximum number of log entries to return (default: 20)                     |
| `dir`   | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ commits: { hash: string; shortHash: string; message: string; author: string; date: string }[] }`

### Remote Operations

#### `git_fetch`

Fetches refs and objects from a remote repository without merging.

| Arg      | Type     | Required | Description                                                               |
| -------- | -------- | -------- | ------------------------------------------------------------------------- |
| `remote` | `string` | No       | Remote name (defaults to origin)                                          |
| `dir`    | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean; output?: string }`

---

#### `git_pull`

Pulls changes from a remote repository.

| Arg      | Type     | Required | Description                                                               |
| -------- | -------- | -------- | ------------------------------------------------------------------------- |
| `remote` | `string` | No       | Remote name (defaults to origin)                                          |
| `branch` | `string` | No       | Branch to pull                                                            |
| `dir`    | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean; output?: string }`

---

#### `git_push`

Pushes commits to a remote repository.

| Arg      | Type      | Required | Description                                                               |
| -------- | --------- | -------- | ------------------------------------------------------------------------- |
| `remote` | `string`  | No       | Remote name (defaults to origin)                                          |
| `branch` | `string`  | No       | Branch to push                                                            |
| `force`  | `boolean` | No       | Force push                                                                |
| `dir`    | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean; output?: string }`

---

#### `git_remote_configure`

Configures a git remote. Adds the remote if not present, or updates its URL.

| Arg   | Type     | Required | Description                                                               |
| ----- | -------- | -------- | ------------------------------------------------------------------------- |
| `url` | `string` | Yes      | Remote repository URL (HTTPS)                                             |
| `dir` | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean }`

### Branch Operations

#### `git_branch`

Lists all local git branches and indicates the current branch.

| Arg   | Type     | Required | Description                                                               |
| ----- | -------- | -------- | ------------------------------------------------------------------------- |
| `dir` | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ current: string; branches: { name: string; isCurrent: boolean }[] }`

---

#### `git_checkout`

Switches to a different git branch, optionally creating it.

| Arg      | Type      | Required | Description                                                               |
| -------- | --------- | -------- | ------------------------------------------------------------------------- |
| `branch` | `string`  | Yes      | Branch name to switch to                                                  |
| `create` | `boolean` | No       | Create the branch if it does not exist                                    |
| `dir`    | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ branch: string }`

### Composed Operations

The tools above each run one git command. These run a **sequence** of them and answer with the outcome, which
is what the caller actually wants to know: a squash either happened or it did not, a rebase either finished,
stopped on files, or failed.

#### `git_squash`

Replaces every commit the branch added since `baseRef` with one commit carrying the given message. Returns how many commits were squashed.

| Arg         | Type      | Required | Description                                                               |
| ----------- | --------- | -------- | ------------------------------------------------------------------------- |
| `baseRef`   | `string`  | Yes      | The ref the branch grew from, e.g. `origin/main`.                         |
| `message`   | `string`  | Yes      | The message of the single commit; taken verbatim, trailers included.      |
| `skipHooks` | `boolean` | No       | Do not run the repository's commit hooks.                                 |
| `dir`       | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ commits: number; message: string }`

The commits are reset into the index and committed again, so the tree is untouched and only the history
changes. The commit is made under the repository's configured identity — set it with `git_config_user`
first. A branch whose net change is nothing still becomes a commit.

---

#### `git_rebase`

Rebases the current branch onto another ref. Returns `{ clean: true }` when it finished, or the unmerged files with the rebase left in progress. Any other failure is aborted and reported as an error.

| Arg    | Type     | Required | Description                                                               |
| ------ | -------- | -------- | ------------------------------------------------------------------------- |
| `onto` | `string` | Yes      | The ref to rebase onto, e.g. `origin/main`.                               |
| `dir`  | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ clean: boolean; conflicts?: string[] }`

The three outcomes are told apart on purpose. A rebase that stops on conflicting files answers those files
and **leaves the rebase in progress**, so an agent or a person can resolve them and run
`git rebase --continue` in the same checkout. A rebase that fails for any other reason is aborted here,
leaving no half-finished state behind, and reported as an error with git's own output.

---

#### `git_checkout_state`

Reports whether a checkout is fit to act on: rebase in progress, dirty tree, leftover conflict markers, and with `baseRef` whether HEAD is built on it and how many commits beyond it.

| Arg       | Type     | Required | Description                                                               |
| --------- | -------- | -------- | ------------------------------------------------------------------------- |
| `baseRef` | `string` | No       | Measure the checkout against this ref, e.g. `origin/main`.                |
| `dir`     | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ branch: string; rebaseInProgress: boolean; dirty: boolean; conflictMarkers: boolean; onBase?: boolean; commitsAhead?: number }`

`git_status` answers what changed; this answers whether the checkout is in a fit state to act on. It is the
read to make after handing a checkout to someone else, where what you need is not a diff but a verdict.

### Repositories

A workspace can hold several repositories in one tree, and git cannot say which ones belong there on purpose:
a tree walk would find every `.git` directory, including those of dependencies and fixtures, and could not
say which is the primary one. So the application that created the checkout declares them, by providing a
`GitRepositorySource` under `GIT_REPOSITORY_SOURCE`:

```ts
@Injectable()
class CheckoutRepositories implements GitRepositorySource {
  constructor(@Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner) {}

  list(workspaceId: string): GitRepository[] {
    return this.workspace.listRepos(workspaceId);
  }
}

@Module({
  imports: [GitModule],
  providers: [{ provide: GIT_REPOSITORY_SOURCE, useClass: CheckoutRepositories }],
})
export class AppModule {}
```

`GET .../git/repos` then answers `{ repos: [{ key, dir, url?, branch?, primary? }] }`, which is what a UI
picks between before asking for a status or a log. Nothing has to provide it: without one the endpoint
answers an empty list, which reads as "one repository, at the root".

### Credentials

`git_push`, `git_pull` and `git_fetch` authenticate with a token they read themselves. The call names
**where** the token comes from, in its config; the token itself is never an argument, because arguments are
the model-facing input of a tool and are kept in the run trace.

| Config          | Reads                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| `tokenEnv`      | An environment variable of the machine the app runs on.                 |
| `tokenSecret`   | A secret of the workspace the run belongs to (needs `SecretsModule`).   |
| `oauthProvider` | The OAuth token of the person the run belongs to (needs `OAuthModule`). |

The first one set wins, in that order, and `GitModule.forRoot()` sets the default for every call:

```ts
// Every push, pull and fetch uses the token in GIT_TOKEN …
GitModule.forRoot({ tokenEnv: 'GIT_TOKEN' });

// … unless one call names another source.
await this.gitPush.call({ remote: 'origin', branch }, { config: { oauthProvider: 'github' } });
```

With no source named the command runs unauthenticated, which is all a public remote needs. The resolved
token goes to the remote server, which applies it through a throwaway `GIT_ASKPASS`, so it never reaches
the URL, the argv or `.git/config`.

### Configuration

#### `git_config_user`

Configures git user.name and user.email for the workspace repository.

| Arg     | Type     | Required | Description                                                               |
| ------- | -------- | -------- | ------------------------------------------------------------------------- |
| `name`  | `string` | Yes      | Git user name (user.name)                                                 |
| `email` | `string` | Yes      | Git user email (user.email)                                               |
| `dir`   | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean }`

### Worktree Operations

#### `git_worktree_add`

Creates a new git worktree at the given path. Optionally checks out an existing branch or creates a new one.

| Arg         | Type      | Required | Description                                                               |
| ----------- | --------- | -------- | ------------------------------------------------------------------------- |
| `path`      | `string`  | Yes      | Filesystem path for the new worktree (relative or absolute)               |
| `branch`    | `string`  | No       | Branch to check out in the new worktree                                   |
| `newBranch` | `boolean` | No       | Create the branch as part of adding the worktree (passes `-b`)            |
| `force`     | `boolean` | No       | Pass `--force` to git worktree add                                        |
| `dir`       | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean; path: string; output?: string }`

---

#### `git_worktree_list`

Lists all git worktrees attached to the repository.

| Arg   | Type     | Required | Description                                                               |
| ----- | -------- | -------- | ------------------------------------------------------------------------- |
| `dir` | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ worktrees: { path: string; head?: string; branch?: string; bare: boolean; detached: boolean; locked?: string; prunable?: string }[] }`

---

#### `git_worktree_remove`

Removes a git worktree at the given path.

| Arg     | Type      | Required | Description                                                               |
| ------- | --------- | -------- | ------------------------------------------------------------------------- |
| `path`  | `string`  | Yes      | Path of the worktree to remove                                            |
| `force` | `boolean` | No       | Remove even if the worktree has uncommitted changes or is locked          |
| `dir`   | `string`  | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean }`

---

#### `git_worktree_prune`

Prunes worktree administrative files for worktrees whose directories no longer exist.

| Arg   | Type     | Required | Description                                                               |
| ----- | -------- | -------- | ------------------------------------------------------------------------- |
| `dir` | `string` | No       | Repository path relative to the workspace root. Omit to address the root. |

**Returns:** `{ success: boolean; output?: string }`

## REST API

`GitController` exposes endpoints under `/api/v1/workspaces/:workspaceId/git` for use by frontends (e.g. the Studio diff viewer):

| Method   | Path           | Description                               |
| -------- | -------------- | ----------------------------------------- |
| `GET`    | `/status`      | Get git status                            |
| `GET`    | `/log?limit=N` | Get commit log                            |
| `GET`    | `/remote`      | Get remote info                           |
| `GET`    | `/branches`    | List branches                             |
| `DELETE` | `/remote`      | Remove the remote                         |
| `GET`    | `/repos`       | List the repositories the workspace holds |

Each endpoint also takes `?dir=` to address a repository below the workspace root, and `?slotId=` to pick the environment slot. `/repos` takes neither: the list is what the workspace was created with, so it needs no running container — see [Repositories](#repositories).

## Public API

- **Module:** `GitModule` (with `forFeature()` for environment gating)
- **Controller:** `GitController`
- **Tools:** `GitSquashTool`, `GitRebaseTool`, `GitCheckoutStateTool`, `GitStatusTool`, `GitAddTool`, `GitCommitTool`, `GitPushTool`, `GitPullTool`, `GitLogTool`, `GitDiffTool`, `GitFetchTool`, `GitCheckoutTool`, `GitBranchTool`, `GitRemoteConfigureTool`, `GitConfigUserTool`, `GitWorktreeAddTool`, `GitWorktreeListTool`, `GitWorktreeRemoveTool`, `GitWorktreePruneTool`
- **Types:** `GitStatusResult`, `GitAddArgs`, `GitAddResult`, `GitCommitArgs`, `GitCommitResult`, `GitPushArgs`, `GitPushResult`, `GitPullArgs`, `GitPullResult`, `GitLogArgs`, `GitCommit`, `GitLogResult`, `GitDiffArgs`, `GitDiffFile`, `GitDiffResult`, `GitFetchArgs`, `GitFetchResult`, `GitCheckoutArgs`, `GitCheckoutResult`, `GitBranchResult`, `GitRemoteConfigureArgs`, `GitRemoteConfigureResult`, `GitConfigUserArgs`, `GitConfigUserResult`, `GitWorktreeAddArgs`, `GitWorktreeAddResult`, `GitWorktreeListResult`, `GitWorktree`, `GitWorktreeRemoveArgs`, `GitWorktreeRemoveResult`, `GitWorktreePruneResult`, `GitDirArgs`, `GitToolConfig`, `GitSquashArgs`, `GitSquashResult`, `GitRebaseArgs`, `GitRebaseResult`, `GitCheckoutStateArgs`, `GitCheckoutStateResult`
- **Services:** `GitTokenService`
- **Tokens:** `GIT_REPOSITORY_SOURCE`, `GIT_TOKEN_SOURCE`
- **Interfaces:** `GitRepositorySource`, `GitRepository`
- **Schemas:** `GitWorktreeAddSchema`, `GitWorktreeRemoveSchema`, `GitDirArgSchema`, `GitToolConfigSchema`

## Dependencies

| Package                       | Role                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `@loopstack/common`           | `BaseTool`, `@Tool`, `@Transition`, `@Workflow` decorators, `RunContext`                   |
| `@loopstack/remote-client`    | `RemoteClient` and `EnvironmentService` -- every tool delegates git commands through these |
| `@nestjs/common`              | NestJS module and DI infrastructure                                                        |
| `@nestjs/typeorm` / `typeorm` | Workspace persistence                                                                      |
| `zod`                         | Tool argument schemas                                                                      |

## Related

- [Git examples](/docs/examples/git) -- includes the Git Commit Flow workflow: status, add, commit, and log in a multi-step workflow
- [`@loopstack/github`](https://loopstack.ai/docs/registry/github) -- GitHub integration (PRs, issues, actions) that pairs well with git operations
- [`@loopstack/remote-client`](https://loopstack.ai/docs/registry/remote-client) -- the underlying transport layer that git tools delegate to
- [Tools documentation](https://loopstack.ai/docs/build/fundamentals/tools) -- how `@Tool`, `BaseTool`, and tool DI work in Loopstack

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
