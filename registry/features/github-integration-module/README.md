---
title: GitHub Integration Module
description: ConnectGitHubWorkflow — end-to-end guided workflow that authenticates via OAuth, creates or links a GitHub repo, configures git remotes, resolves branch divergence via HITL, and pushes. Uses GitHubIntegrationModule, OAuthWorkflow, AskUserWorkflow, git tools.
---

# @loopstack/github-integration

> GitHub integration workflow module for the [Loopstack](https://loopstack.ai) automation framework.

Provides `ConnectGitHubWorkflow`, a guided multi-step workflow that takes a workspace from "not connected" to "pushed to GitHub". It composes OAuth authentication, repo creation/linking, remote configuration, and branch divergence resolution into a single reusable workflow with human-in-the-loop decision points.

## When to Use

- You need a one-click "Connect to GitHub" experience that handles OAuth, repo setup, and push in a single workflow.
- You want to embed GitHub onboarding into a larger workflow by calling `ConnectGitHubWorkflow` as a sub-workflow.
- You need guided divergence resolution when connecting to a repo that already has commits.
- **Use `@loopstack/github-module` instead** if you only need individual GitHub API tools (repos, issues, PRs, actions) without the guided connection flow.

## Installation

```sh
npm install @loopstack/github-integration @loopstack/github-module @loopstack/git-module @loopstack/hitl @loopstack/oauth-module @loopstack/remote-client
```

Register the module:

```ts
import { Module } from '@nestjs/common';
import { GitHubIntegrationModule } from '@loopstack/github-integration';

@Module({
  imports: [GitHubIntegrationModule],
})
export class AppModule {}
```

`GitHubIntegrationModule` imports `GitModule`, `GitHubModule`, `HitlModule`, and `OAuthModule` internally. You do not need to import those yourself, but their packages must be installed.

A GitHub OAuth app must be configured in your OAuth provider setup (client ID and secret). See the [`@loopstack/oauth-module`](https://loopstack.ai/docs/registry/features/oauth-module) and [`@loopstack/github-module`](https://loopstack.ai/docs/registry/features/github-module) docs for details.

## Quick Start

Inject `ConnectGitHubWorkflow` into your own workflow and run it as a sub-workflow:

```ts
import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, LinkDocument, Transition, Workflow } from '@loopstack/common';
import { ConnectGitHubWorkflow } from '@loopstack/github-integration';

@Workflow({
  title: 'Setup Project',
  description: 'Initialises a project and connects it to GitHub.',
  schema: z.object({}).strict(),
})
export class SetupProjectWorkflow extends BaseWorkflow {
  constructor(private readonly connectGitHub: ConnectGitHubWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting_github' })
  async start(state: Record<string, never>): Promise<unknown> {
    const result = await this.connectGitHub.run({}, { callback: { transition: 'onGitHubConnected' } });

    await this.documentStore.save(
      LinkDocument,
      { label: 'Connect to GitHub', workflowId: result.workflowId, embed: true, expanded: true },
      { id: 'link_github' },
    );

    return state;
  }

  @Transition({ from: 'awaiting_github', to: 'end', wait: true, schema: CallbackSchema })
  async onGitHubConnected(state: Record<string, never>, payload: { data: unknown }): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      { label: 'Connect to GitHub', status: 'success', embed: true, expanded: false },
      { id: 'link_github' },
    );

    return { github: payload.data };
  }
}
```

## How It Works

`ConnectGitHubWorkflow` is a state-machine workflow that orchestrates multiple sub-workflows and tools:

```
start
  │
  ▼
check_auth ──[needs auth]──► awaiting_auth ──[callback]──► check_auth
  │
  ▼
awaiting_choice ──[callback]──► route_choice
  │                                │
  │              ┌─────────────────┼─────────────────┐
  │              ▼                                   ▼
  │         createRepo (wait)                  repoSelected (wait)
  │              │                                   │
  │              └─────────────────┬─────────────────┘
  │                                ▼
  │                        configure_remote
  │                                │
  │                                ▼
  │                       check_uncommitted
  │                         │            │
  │              [clean]────┘            └────[dirty]
  │                 │                          │
  │                 ▼                          ▼
  │            setup_remote         awaiting_commit_confirm
  │                 │                          │
  │                 │              [callback]───┘
  │                 │                 │
  │                 └────────┬───────┘
  │                          ▼
  │                   check_divergence
  │                     │          │
  │         [can push]──┘          └──[diverged]
  │              │                        │
  │              ▼                        ▼
  │             done              awaiting_sync_choice
  │              │                        │
  │              │            [callback]───┘
  │              │                 │
  │              └────────┬───────┘
  │                       ▼
  │                      done
  │                       │
  │                       ▼
  │                      end
```

### Step-by-step

1. **Check auth** -- calls `GitHubGetAuthenticatedUserTool` to see if the user already has a valid token.
2. **OAuth** -- if not authenticated, launches `OAuthWorkflow` with `provider: 'github'` and `scopes: ['repo', 'user']`. Displays a sign-in link via `LinkDocument`.
3. **Repo choice** -- uses `AskUserWorkflow` (HITL) to let the user choose between creating a new repo or connecting an existing one.
4. **Create or select** -- either calls `GitHubCreateRepoTool` or `GitHubListReposTool` followed by a second HITL prompt to pick from the list.
5. **Uncommitted changes** -- checks `GitStatusTool` for uncommitted work. If dirty, asks the user whether to auto-commit or cancel.
6. **Remote setup** -- configures the git remote URL via `GitRemoteConfigureTool`, sets the user identity via `GitConfigUserTool`, and fetches remote refs.
7. **Divergence resolution** -- compares local and remote branches. If diverged, asks the user to choose: pull, merge, force-push, or cancel.
8. **Push** -- calls `GitPushTool` to finalize the connection.
9. **Result** -- saves a `MarkdownDocument` summarizing the outcome and dispatches a `git.updated` workspace event.

### Return value

On success:

```json
{ "repo": "user/repo-name", "url": "https://github.com/user/repo-name" }
```

On cancellation:

```json
{ "cancelled": true }
```

## Args Reference

`ConnectGitHubWorkflow` takes no arguments (empty object schema):

| Arg      | Type | Required | Description                                                                              |
| -------- | ---- | -------- | ---------------------------------------------------------------------------------------- |
| _(none)_ | --   | --       | The workflow requires no input args. OAuth and repo details are collected interactively. |

## Configuration

No module-level configuration. OAuth credentials are managed by `@loopstack/oauth-module` and the GitHub OAuth provider from `@loopstack/github-module`.

## Public API

- **Module:** `GitHubIntegrationModule`
- **Workflow:** `ConnectGitHubWorkflow`

## Dependencies

| Package                    | Role                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@loopstack/common`        | Framework types, decorators (`@Workflow`, `@Transition`, `@Guard`), documents (`LinkDocument`, `MarkdownDocument`) |
| `@loopstack/core`          | `ClientMessageService` for dispatching workspace events                                                            |
| `@loopstack/git-module`    | Git tools: `GitStatusTool`, `GitPushTool`, `GitFetchTool`, `GitRemoteConfigureTool`, `GitConfigUserTool`           |
| `@loopstack/github-module` | GitHub API tools: `GitHubGetAuthenticatedUserTool`, `GitHubCreateRepoTool`, `GitHubListReposTool`                  |
| `@loopstack/hitl`          | `AskUserWorkflow` for interactive decision points                                                                  |
| `@loopstack/oauth-module`  | `OAuthWorkflow` and `OAuthTokenStore` for GitHub authentication                                                    |
| `@loopstack/remote-client` | `BashTool` for running git commands on the remote server                                                           |
| `zod`                      | Schema validation                                                                                                  |

## Related

- [`@loopstack/github-module`](https://loopstack.ai/docs/registry/features/github-module) -- low-level GitHub API tools (repos, issues, PRs, actions, search) used by this workflow
- [`@loopstack/git-module`](https://loopstack.ai/docs/registry/features/git-module) -- git tools for commit, push, pull, branch, and remote operations
- [`@loopstack/oauth-module`](https://loopstack.ai/docs/registry/features/oauth-module) -- provider-agnostic OAuth framework; required for the GitHub OAuth flow
- [`@loopstack/hitl`](https://loopstack.ai/docs/registry/features/hitl-module) -- human-in-the-loop workflows used for interactive prompts
- [Workflows](https://loopstack.ai/docs/build/fundamentals/workflows) -- how to build and compose workflows in Loopstack
- [Sub-workflows](https://loopstack.ai/docs/build/patterns/sub-workflows) -- pattern for calling one workflow from another with callbacks

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
