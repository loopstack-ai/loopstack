---
title: Git Module
description: Git version control tools for Loopstack workflows — GitStatusTool,
  GitAddTool, GitCommitTool, GitPushTool, GitPullTool, GitLogTool, GitDiffTool,
  GitFetchTool, GitCheckoutTool, GitBranchTool, GitRemoteConfigureTool,
  GitConfigUserTool, GitWorktreeAddTool, GitWorktreeListTool,
  GitWorktreeRemoveTool, GitWorktreePruneTool, GitModule, GitController REST API,
  forFeature configuration
---

# @loopstack/git-module

> Git version control module for the [Loopstack](https://loopstack.ai) automation framework.

Provides 16 workflow tools that cover the full git lifecycle -- status, staging, commits, branches, remotes, worktrees, and more. Every tool delegates to a remote agent via `RemoteClient`, so the actual `git` commands run on the machine that hosts the repository, not on the workflow host.

## When to Use

- You need a workflow to inspect, stage, commit, or push changes in a git repository.
- You want to automate branch management (create, checkout, list) as part of a CI or agent workflow.
- You need parallel working directories via git worktrees for concurrent tasks.
- You want REST endpoints for a UI (e.g. the Loopstack Studio diff viewer) to trigger git operations without starting a workflow.

## Installation

```sh
npm install @loopstack/git-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git-module';

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

## Quick Start

A workflow that checks status, stages all files, commits, and reads back the log:

```ts
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GitAddTool, GitCommitTool, GitLogTool, GitStatusTool } from '@loopstack/git-module';

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
  async checkAndStage(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const status = await this.gitStatus.call();
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Status: ${JSON.stringify(status.data, null, 2)}`,
    });
    await this.gitAdd.call({ files: ['.'] });
    return state;
  }

  @Transition({ from: 'staged', to: 'end' })
  async commitAndLog(_state: Record<string, unknown>): Promise<unknown> {
    await this.gitCommit.call({ message: 'chore: automated commit' });
    const log = await this.gitLog.call({ limit: 1 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Committed: ${JSON.stringify(log.data, null, 2)}`,
    });
    return {};
  }
}
```

Register the workflow alongside `GitModule`:

```ts
import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git-module';
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

### Core Operations

#### `git_status`

Gets the git status of the workspace. Returns current branch, staged, modified, untracked, and deleted files.

| Arg      | Type | Required | Description  |
| -------- | ---- | -------- | ------------ |
| _(none)_ |      |          | No arguments |

**Returns:** `{ branch: string; staged: string[]; modified: string[]; untracked: string[]; deleted: string[] }`

---

#### `git_add`

Stages files for the next git commit.

| Arg     | Type       | Required | Description                                            |
| ------- | ---------- | -------- | ------------------------------------------------------ |
| `files` | `string[]` | Yes      | File paths to stage. Use `["."]` to stage all changes. |

**Returns:** `{ success: boolean }`

---

#### `git_commit`

Creates a git commit with the currently staged changes.

| Arg       | Type     | Required | Description        |
| --------- | -------- | -------- | ------------------ |
| `message` | `string` | Yes      | The commit message |

**Returns:** `{ hash: string; message: string }`

---

#### `git_diff`

Shows changed files in the workspace. Returns file paths and their change status.

| Arg      | Type      | Required | Description                             |
| -------- | --------- | -------- | --------------------------------------- |
| `staged` | `boolean` | No       | Show staged changes instead of unstaged |

**Returns:** `{ files: { path: string; status: string }[] }`

---

#### `git_log`

Shows the git commit log for the workspace repository.

| Arg     | Type     | Required | Description                                           |
| ------- | -------- | -------- | ----------------------------------------------------- |
| `limit` | `number` | No       | Maximum number of log entries to return (default: 20) |

**Returns:** `{ commits: { hash: string; shortHash: string; message: string; author: string; date: string }[] }`

### Remote Operations

#### `git_fetch`

Fetches refs and objects from a remote repository without merging.

| Arg      | Type     | Required | Description                      |
| -------- | -------- | -------- | -------------------------------- |
| `remote` | `string` | No       | Remote name (defaults to origin) |
| `token`  | `string` | No       | Access token for authentication  |

**Returns:** `{ success: boolean; output?: string }`

---

#### `git_pull`

Pulls changes from a remote repository.

| Arg      | Type     | Required | Description                      |
| -------- | -------- | -------- | -------------------------------- |
| `remote` | `string` | No       | Remote name (defaults to origin) |
| `branch` | `string` | No       | Branch to pull                   |
| `token`  | `string` | No       | Access token for authentication  |

**Returns:** `{ success: boolean; output?: string }`

---

#### `git_push`

Pushes commits to a remote repository.

| Arg      | Type      | Required | Description                      |
| -------- | --------- | -------- | -------------------------------- |
| `remote` | `string`  | No       | Remote name (defaults to origin) |
| `branch` | `string`  | No       | Branch to push                   |
| `force`  | `boolean` | No       | Force push                       |
| `token`  | `string`  | No       | Access token for authentication  |

**Returns:** `{ success: boolean; output?: string }`

---

#### `git_remote_configure`

Configures a git remote. Adds the remote if not present, or updates its URL.

| Arg   | Type     | Required | Description                   |
| ----- | -------- | -------- | ----------------------------- |
| `url` | `string` | Yes      | Remote repository URL (HTTPS) |

**Returns:** `{ success: boolean }`

### Branch Operations

#### `git_branch`

Lists all local git branches and indicates the current branch.

| Arg      | Type | Required | Description  |
| -------- | ---- | -------- | ------------ |
| _(none)_ |      |          | No arguments |

**Returns:** `{ current: string; branches: { name: string; isCurrent: boolean }[] }`

---

#### `git_checkout`

Switches to a different git branch, optionally creating it.

| Arg      | Type      | Required | Description                            |
| -------- | --------- | -------- | -------------------------------------- |
| `branch` | `string`  | Yes      | Branch name to switch to               |
| `create` | `boolean` | No       | Create the branch if it does not exist |

**Returns:** `{ branch: string }`

### Configuration

#### `git_config_user`

Configures git user.name and user.email for the workspace repository.

| Arg     | Type     | Required | Description                 |
| ------- | -------- | -------- | --------------------------- |
| `name`  | `string` | Yes      | Git user name (user.name)   |
| `email` | `string` | Yes      | Git user email (user.email) |

**Returns:** `{ success: boolean }`

### Worktree Operations

#### `git_worktree_add`

Creates a new git worktree at the given path. Optionally checks out an existing branch or creates a new one.

| Arg         | Type      | Required | Description                                                    |
| ----------- | --------- | -------- | -------------------------------------------------------------- |
| `path`      | `string`  | Yes      | Filesystem path for the new worktree (relative or absolute)    |
| `branch`    | `string`  | No       | Branch to check out in the new worktree                        |
| `newBranch` | `boolean` | No       | Create the branch as part of adding the worktree (passes `-b`) |
| `force`     | `boolean` | No       | Pass `--force` to git worktree add                             |

**Returns:** `{ success: boolean; path: string; output?: string }`

---

#### `git_worktree_list`

Lists all git worktrees attached to the repository.

| Arg      | Type | Required | Description  |
| -------- | ---- | -------- | ------------ |
| _(none)_ |      |          | No arguments |

**Returns:** `{ worktrees: { path: string; head?: string; branch?: string; bare: boolean; detached: boolean; locked?: string; prunable?: string }[] }`

---

#### `git_worktree_remove`

Removes a git worktree at the given path.

| Arg     | Type      | Required | Description                                                      |
| ------- | --------- | -------- | ---------------------------------------------------------------- |
| `path`  | `string`  | Yes      | Path of the worktree to remove                                   |
| `force` | `boolean` | No       | Remove even if the worktree has uncommitted changes or is locked |

**Returns:** `{ success: boolean }`

---

#### `git_worktree_prune`

Prunes worktree administrative files for worktrees whose directories no longer exist.

| Arg      | Type | Required | Description  |
| -------- | ---- | -------- | ------------ |
| _(none)_ |      |          | No arguments |

**Returns:** `{ success: boolean; output?: string }`

## REST API

`GitController` exposes endpoints under `/api/v1/workspaces/:workspaceId/git` for use by frontends (e.g. the Studio diff viewer):

| Method   | Path           | Description       |
| -------- | -------------- | ----------------- |
| `GET`    | `/status`      | Get git status    |
| `GET`    | `/log?limit=N` | Get commit log    |
| `GET`    | `/remote`      | Get remote info   |
| `GET`    | `/branches`    | List branches     |
| `DELETE` | `/remote`      | Remove the remote |

## Public API

- **Module:** `GitModule` (with `forFeature()` for environment gating)
- **Controller:** `GitController`
- **Tools:** `GitStatusTool`, `GitAddTool`, `GitCommitTool`, `GitPushTool`, `GitPullTool`, `GitLogTool`, `GitDiffTool`, `GitFetchTool`, `GitCheckoutTool`, `GitBranchTool`, `GitRemoteConfigureTool`, `GitConfigUserTool`, `GitWorktreeAddTool`, `GitWorktreeListTool`, `GitWorktreeRemoveTool`, `GitWorktreePruneTool`
- **Types:** `GitStatusResult`, `GitAddArgs`, `GitAddResult`, `GitCommitArgs`, `GitCommitResult`, `GitPushArgs`, `GitPushResult`, `GitPullArgs`, `GitPullResult`, `GitLogArgs`, `GitCommit`, `GitLogResult`, `GitDiffArgs`, `GitDiffFile`, `GitDiffResult`, `GitFetchArgs`, `GitFetchResult`, `GitCheckoutArgs`, `GitCheckoutResult`, `GitBranchResult`, `GitRemoteConfigureArgs`, `GitRemoteConfigureResult`, `GitConfigUserArgs`, `GitConfigUserResult`, `GitWorktreeAddArgs`, `GitWorktreeAddResult`, `GitWorktreeListResult`, `GitWorktree`, `GitWorktreeRemoveArgs`, `GitWorktreeRemoveResult`, `GitWorktreePruneResult`
- **Schemas:** `GitWorktreeAddSchema`, `GitWorktreeRemoveSchema`

## Dependencies

| Package                       | Role                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `@loopstack/common`           | `BaseTool`, `@Tool`, `@Transition`, `@Workflow` decorators, `RunContext`                   |
| `@loopstack/remote-client`    | `RemoteClient` and `EnvironmentService` -- every tool delegates git commands through these |
| `@nestjs/common`              | NestJS module and DI infrastructure                                                        |
| `@nestjs/typeorm` / `typeorm` | Workspace persistence                                                                      |
| `zod`                         | Tool argument schemas                                                                      |

## Related

- [`git-commit-flow-example-workflow`](https://loopstack.ai/docs/registry/examples/git-commit-flow-example-workflow) -- full example showing status, add, commit, and log in a multi-step workflow
- [`@loopstack/github-module`](https://loopstack.ai/docs/registry/features/github-module) -- GitHub integration (PRs, issues, actions) that pairs well with git operations
- [`@loopstack/remote-client`](https://loopstack.ai/docs/registry/features/remote-client-module) -- the underlying transport layer that git tools delegate to
- [Tools documentation](https://loopstack.ai/docs/build/fundamentals/tools) -- how `@Tool`, `BaseTool`, and tool DI work in Loopstack

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
