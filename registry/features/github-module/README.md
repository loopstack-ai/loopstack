---
title: GitHub Module
description: GitHub OAuth provider and 25 API tools for Loopstack workflows — GitHubModule, GitHubOAuthProvider, OAuthProviderInterface, repositories, issues, pull requests, actions, content/git ops, search, users/orgs. Covers installation, tool args, auth pattern, and env vars.
---

# @loopstack/github-module

> GitHub integration module for the [Loopstack](https://loopstack.ai) automation framework.

Provides a GitHub OAuth 2.0 provider and 25 tools for interacting with the GitHub API. The module registers a GitHub OAuth provider with `@loopstack/oauth-module` so workflows can authenticate users and then call GitHub tools for repositories, issues, pull requests, file content, actions, search, and user/org data.

## When to Use

- You need to **authenticate users via GitHub OAuth** and call GitHub APIs from workflows
- You want to **manage repositories, issues, and pull requests** programmatically (list, create, merge)
- You need to **read or write file content**, browse directories, or inspect commits in GitHub repos
- You want to **trigger and monitor GitHub Actions** workflow runs, or **search** code/repos/issues across GitHub

Use `@loopstack/git-module` instead if you need local Git operations (commit, push, branch) on a cloned repository.

## Installation

```bash
npm install @loopstack/github-module @loopstack/oauth-module
```

Import `GitHubModule` in your module. It automatically imports `OAuthModule` and registers the GitHub OAuth provider on startup:

```typescript
import { Module } from '@nestjs/common';
import { GitHubModule } from '@loopstack/github-module';

@Module({
  imports: [GitHubModule],
  providers: [MyWorkflow],
  exports: [MyWorkflow],
})
export class MyModule {}
```

Set the required environment variables:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_OAUTH_REDIRECT_URI=/oauth/callback
```

## Quick Start

### Agent workflow

The fastest way to use GitHub tools is through `AgentWorkflow` — pass tool names as strings and let the LLM call them on demand:

```typescript
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

@Workflow({ title: 'GitHub Assistant' })
export class GitHubAssistantWorkflow extends BaseWorkflow {
  constructor(private readonly agent: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'chatting' })
  async start(state: Record<string, unknown>) {
    await this.agent.run(
      {
        system: 'You are a GitHub assistant. Help the user manage repos, issues, PRs, and actions.',
        tools: [
          'github_get_authenticated_user',
          'github_list_repos',
          'github_get_repo',
          'github_list_issues',
          'github_create_issue',
          'github_list_pull_requests',
          'github_get_pull_request',
          'github_list_workflow_runs',
          'github_search_code',
        ],
        userMessage: 'List my five most recently updated repositories.',
      },
      { callback: { transition: 'agentDone' }, show: 'inline', label: 'Working...' },
    );
  }
}
```

Every GitHub tool returns `{ error: 'unauthorized' }` when no valid token is available, so the agent loop can detect missing auth and trigger the OAuth flow as a sub-workflow when needed.

### Structured workflow with explicit OAuth

For full control over the auth flow, inject the individual tools and `OAuthWorkflow`. When a tool returns `error: 'unauthorized'`, launch the OAuth sub-workflow so the user can sign in, then retry.

```typescript
import { z } from 'zod';
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { GitHubGetAuthenticatedUserTool, GitHubListReposTool } from '@loopstack/github-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';

interface State {
  requiresAuth?: boolean;
  repos?: Array<{ fullName: string; htmlUrl: string }>;
}

@Workflow({
  name: 'my_github_workflow',
  title: 'My GitHub Workflow',
  schema: z.object({}).strict(),
})
export class MyGitHubWorkflow extends BaseWorkflow {
  constructor(
    private readonly gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool,
    private readonly gitHubListRepos: GitHubListReposTool,
    private readonly oAuthWorkflow: OAuthWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'user_checked' })
  async checkUser(state: State) {
    const result = await this.gitHubGetAuthenticatedUser.call();
    this.assignState({ requiresAuth: result.data.error === 'unauthorized' });
  }

  @Transition({ from: 'user_checked', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async startAuth(state: State) {
    await this.oAuthWorkflow.run(
      { provider: 'github', scopes: ['repo', 'read:org', 'workflow'] },
      { callback: { transition: 'authCompleted' }, show: 'inline', label: 'GitHub authentication required' },
    );
  }

  needsAuth(state: State): boolean {
    return !!state.requiresAuth;
  }

  @Transition({ from: 'awaiting_auth', to: 'start', wait: true })
  authCompleted(state: State, _input: TransitionInput) {}

  @Transition({ from: 'user_checked', to: 'end' })
  async listRepos(state: State) {
    const result = await this.gitHubListRepos.call({ sort: 'updated', perPage: 10 });
    this.assignState({ repos: result.data.repos });
  }
}
```

## How It Works

### Provider Registration

`GitHubOAuthProvider` implements `OAuthProviderInterface` and `OnModuleInit`. On startup it registers itself with the `OAuthProviderRegistry`:

```typescript
onModuleInit(): void {
  this.providerRegistry.register(this);
}
```

After registration, the generic `OAuthWorkflow` from `@loopstack/oauth-module` handles authentication for `provider: 'github'` automatically.

| Property        | Value                                         |
| --------------- | --------------------------------------------- |
| `providerId`    | `'github'`                                    |
| `defaultScopes` | `repo`, `user`, `workflow`, `read:org`        |
| Auth endpoint   | `https://github.com/login/oauth/authorize`    |
| Token endpoint  | `https://github.com/login/oauth/access_token` |

> GitHub OAuth tokens do not expire and do not support refresh. The `refreshToken()` method throws an error.

### Authentication Pattern

There is no dedicated authentication tool — authentication is triggered at the workflow level when any tool returns `{ error: 'unauthorized' }`. All 25 tools follow the same pattern: they read the user's stored OAuth token via `OAuthTokenStore.getValidAccessToken(ctx.userId, 'github')`. If no token exists, they return `{ error: 'unauthorized' }` instead of throwing. Your workflow checks for this error and launches `OAuthWorkflow` with `provider: 'github'` as a sub-workflow:

```
start --> checkUser --> [needsAuth?] --> startAuth --> awaiting_auth
                    \                                      |
                     \                              authCompleted
                      \                                    |
                       +----> listRepos --> end <----- (retries from start)
```

### Tool Resolution

Tools are NestJS providers resolved by their `@Tool({ name })` value from the DI container. Inject the tool class into your workflow constructor and call it with `.call(args)` or `.call(args, options)`.

## Tools Reference

All tools return `{ error: string, message: string }` when authentication fails or the GitHub API returns an error.

### Repositories

| Tool name              | Description                                   | Args                                                                                                                                                                                                | Return                                                                                                                                                                          |
| ---------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_list_repos`    | Lists repositories for the authenticated user | `visibility?` (`'all'`\|`'public'`\|`'private'`, default `'all'`), `sort?` (`'created'`\|`'updated'`\|`'pushed'`\|`'full_name'`, default `'updated'`), `perPage?` (default 30), `page?` (default 1) | `{ repos: [{ id, fullName, name, owner, private, htmlUrl, description, language, defaultBranch, updatedAt }] }`                                                                 |
| `github_get_repo`      | Gets detailed repo information                | `owner`, `repo`                                                                                                                                                                                     | `{ repo: { id, fullName, name, owner, ownerAvatar, private, htmlUrl, description, language, defaultBranch, stars, forks, openIssues, createdAt, updatedAt, topics, license } }` |
| `github_create_repo`   | Creates a new repository                      | `name`, `description?`, `private?` (default false), `autoInit?` (default false)                                                                                                                     | `{ repo: { id, fullName, name, htmlUrl, private, defaultBranch } }`                                                                                                             |
| `github_list_branches` | Lists branches for a repository               | `owner`, `repo`, `perPage?` (default 30)                                                                                                                                                            | `{ branches: [{ name, commitSha, protected }] }`                                                                                                                                |

### Issues

| Tool name                     | Description                          | Args                                                                                                                                              | Return                                                                                                                                 |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `github_list_issues`          | Lists issues for a repository        | `owner`, `repo`, `state?` (`'open'`\|`'closed'`\|`'all'`, default `'open'`), `labels?`, `assignee?`, `perPage?` (default 30), `page?` (default 1) | `{ issues: [{ id, number, title, state, user, labels, assignees, createdAt, updatedAt, htmlUrl, isPullRequest }] }`                    |
| `github_get_issue`            | Gets detailed issue information      | `owner`, `repo`, `issueNumber`                                                                                                                    | `{ issue: { id, number, title, body, state, user, labels, assignees, milestone, createdAt, updatedAt, closedAt, htmlUrl, comments } }` |
| `github_create_issue`         | Creates a new issue                  | `owner`, `repo`, `title`, `body?`, `labels?` (string[]), `assignees?` (string[])                                                                  | `{ issue: { id, number, title, htmlUrl, state } }`                                                                                     |
| `github_create_issue_comment` | Comments on an issue or pull request | `owner`, `repo`, `issueNumber`, `body`                                                                                                            | `{ comment: { id, htmlUrl, createdAt, user } }`                                                                                        |

### Pull Requests

| Tool name                    | Description                            | Args                                                                                                                                   | Return                                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_list_pull_requests`  | Lists pull requests for a repository   | `owner`, `repo`, `state?` (`'open'`\|`'closed'`\|`'all'`, default `'open'`), `base?`, `perPage?` (default 30), `page?` (default 1)     | `{ pullRequests: [{ id, number, title, state, user, head, headSha, base, createdAt, updatedAt, htmlUrl, draft }] }`                                                                                               |
| `github_get_pull_request`    | Gets detailed pull request information | `owner`, `repo`, `pullNumber`                                                                                                          | `{ pullRequest: { id, number, title, body, state, user, head, headSha, base, merged, mergeable, draft, additions, deletions, changedFiles, createdAt, updatedAt, mergedAt, htmlUrl, comments, reviewComments } }` |
| `github_create_pull_request` | Creates a new pull request             | `owner`, `repo`, `title`, `head`, `base`, `body?`, `draft?` (default false)                                                            | `{ pullRequest: { id, number, title, htmlUrl, state, draft } }`                                                                                                                                                   |
| `github_merge_pull_request`  | Merges a pull request                  | `owner`, `repo`, `pullNumber`, `mergeMethod?` (`'merge'`\|`'squash'`\|`'rebase'`, default `'merge'`), `commitTitle?`, `commitMessage?` | `{ merge: { sha, merged, message } }`                                                                                                                                                                             |
| `github_list_pr_reviews`     | Lists reviews on a pull request        | `owner`, `repo`, `pullNumber`                                                                                                          | `{ reviews: [{ id, user, body, state, submittedAt, htmlUrl }] }`                                                                                                                                                  |

### Content / Git Ops

| Tool name                      | Description                                         | Args                                                                                           | Return                                                                                                                                                                                                         |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_get_file_content`      | Gets file content (base64-decoded)                  | `owner`, `repo`, `path`, `ref?`                                                                | `{ file: { name, path, sha, size, type, content, htmlUrl } }`                                                                                                                                                  |
| `github_create_or_update_file` | Creates or updates a file (provide `sha` to update) | `owner`, `repo`, `path`, `content` (plain text), `message` (commit message), `sha?`, `branch?` | `{ file: { name, path, sha, htmlUrl }, commit: { sha, message } }`                                                                                                                                             |
| `github_list_directory`        | Lists directory contents                            | `owner`, `repo`, `path?` (default `''`), `ref?`                                                | `{ entries: [{ name, path, sha, size, type, htmlUrl }] }`                                                                                                                                                      |
| `github_get_commit`            | Gets commit details with file stats                 | `owner`, `repo`, `ref`                                                                         | `{ commit: { sha, message, author: { name, email, date, login }, committer: { name, date }, htmlUrl, stats: { additions, deletions, total }, files: [{ filename, status, additions, deletions, changes }] } }` |

### Actions

| Tool name                   | Description                        | Args                                                                                       | Return                                                                                                                                                  |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github_list_workflow_runs` | Lists workflow runs                | `owner`, `repo`, `branch?`, `status?` (enum), `perPage?` (default 30), `page?` (default 1) | `{ totalCount, runs: [{ id, name, status, conclusion, headBranch, headSha, event, createdAt, updatedAt, htmlUrl }] }`                                   |
| `github_trigger_workflow`   | Triggers a workflow dispatch event | `owner`, `repo`, `workflowId` (string), `ref`, `inputs?` (Record<string, string>)          | `{ triggered: true, message }`                                                                                                                          |
| `github_get_workflow_run`   | Gets workflow run details          | `owner`, `repo`, `runId` (number)                                                          | `{ run: { id, name, status, conclusion, headBranch, headSha, event, workflowId, runNumber, runAttempt, createdAt, updatedAt, runStartedAt, htmlUrl } }` |

### Search

| Tool name              | Description                       | Args                                                                                                                        | Return                                                                                                        |
| ---------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `github_search_code`   | Searches code across repositories | `query`, `perPage?` (default 30), `page?` (default 1)                                                                       | `{ totalCount, results: [{ name, path, sha, htmlUrl, repository }] }`                                         |
| `github_search_repos`  | Searches repositories             | `query`, `sort?` (`'stars'`\|`'forks'`\|`'help-wanted-issues'`\|`'updated'`), `perPage?` (default 30), `page?` (default 1)  | `{ totalCount, results: [{ id, fullName, description, htmlUrl, language, stars, forks, updatedAt }] }`        |
| `github_search_issues` | Searches issues and pull requests | `query`, `sort?` (`'comments'`\|`'reactions'`\|`'created'`\|`'updated'`\|...), `perPage?` (default 30), `page?` (default 1) | `{ totalCount, results: [{ id, number, title, state, user, htmlUrl, createdAt, updatedAt, isPullRequest }] }` |

### Users & Orgs

| Tool name                       | Description                                  | Args                    | Return                                                                                                        |
| ------------------------------- | -------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `github_get_authenticated_user` | Gets the authenticated user's profile        | _(none)_                | `{ user: { id, login, name, email, avatarUrl, htmlUrl, bio, publicRepos, followers, following, createdAt } }` |
| `github_list_user_orgs`         | Lists the authenticated user's organizations | `perPage?` (default 30) | `{ orgs: [{ id, login, description, avatarUrl }] }`                                                           |

## Configuration

| Variable                    | Required | Description                                  |
| --------------------------- | -------- | -------------------------------------------- |
| `GITHUB_CLIENT_ID`          | Yes      | GitHub OAuth App client ID                   |
| `GITHUB_CLIENT_SECRET`      | Yes      | GitHub OAuth App client secret               |
| `GITHUB_OAUTH_REDIRECT_URI` | No       | Redirect URI (defaults to `/oauth/callback`) |

Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers) to obtain client credentials.

## Public API

**Module**

- `GitHubModule` -- NestJS module; imports `OAuthModule`, provides and exports all tools and the provider

**Provider**

- `GitHubOAuthProvider` -- implements `OAuthProviderInterface`, self-registers with `OAuthProviderRegistry`

**Tools -- Repositories**

- `GitHubListReposTool`, `GitHubGetRepoTool`, `GitHubCreateRepoTool`, `GitHubListBranchesTool`

**Tools -- Issues**

- `GitHubListIssuesTool`, `GitHubGetIssueTool`, `GitHubCreateIssueTool`, `GitHubCreateIssueCommentTool`

**Tools -- Pull Requests**

- `GitHubListPullRequestsTool`, `GitHubGetPullRequestTool`, `GitHubCreatePullRequestTool`, `GitHubMergePullRequestTool`, `GitHubListPrReviewsTool`

**Tools -- Content / Git Ops**

- `GitHubGetFileContentTool`, `GitHubCreateOrUpdateFileTool`, `GitHubListDirectoryTool`, `GitHubGetCommitTool`

**Tools -- Actions**

- `GitHubListWorkflowRunsTool`, `GitHubTriggerWorkflowTool`, `GitHubGetWorkflowRunTool`

**Tools -- Search**

- `GitHubSearchCodeTool`, `GitHubSearchReposTool`, `GitHubSearchIssuesTool`

**Tools -- Users & Orgs**

- `GitHubGetAuthenticatedUserTool`, `GitHubListUserOrgsTool`

**Types** (exported per tool)

- `GitHub*Args`, `GitHub*Result` -- Zod-inferred arg types and result types for each tool

## Dependencies

| Package                   | Role                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `@loopstack/common`       | Base classes (`BaseTool`, `Tool`, `Workflow`, `Transition`), documents, context types |
| `@loopstack/oauth-module` | `OAuthProviderRegistry`, `OAuthProviderInterface`, `OAuthTokenStore`, `OAuthWorkflow` |
| `zod`                     | Schema definitions for tool args                                                      |

## Related

- [OAuth Authentication](https://loopstack.ai/docs/build/integrations/oauth) -- how to use `OAuthWorkflow` as a sub-workflow, token management, and the guard-based auth pattern
- [`@loopstack/oauth-module`](https://loopstack.ai/docs/registry/features/oauth-module) -- the provider-agnostic OAuth framework this module plugs into
- [`@loopstack/github-oauth-example`](https://loopstack.ai/docs/registry/examples/github-oauth-example) -- full example with a repo overview workflow and a GitHub chat agent using all 25 tools
- [`@loopstack/git-module`](https://loopstack.ai/docs/registry/features/git-module) -- local Git operations (commit, push, branch, diff) for cloned repositories

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
