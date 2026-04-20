# @loopstack/github-integration

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

End-to-end GitHub integration workflow for Loopstack workspaces. Wires up OAuth, repo creation / linking, remote configuration, and divergence resolution into one reusable workflow.

## Overview

Getting a workspace connected to GitHub is a multi-step affair: authenticate with OAuth, either create a new repo or link an existing one, configure the git remote, handle divergence with an existing remote branch, and push. `ConnectGitHubWorkflow` drives this whole flow, asking the user for input at decision points via `@loopstack/hitl`.

See [SETUP.md](./SETUP.md) for OAuth application setup (client ID / secret).

By using this module you'll get:

- **`ConnectGitHubWorkflow`** — a guided workflow that takes a fresh Loopstack workspace from "not connected" to "pushed to GitHub"

## Installation

```sh
npm install @loopstack/github-integration
```

Register the module:

```ts
import { GitHubIntegrationModule } from '@loopstack/github-integration';

@Module({
  imports: [GitHubIntegrationModule /* ... */],
})
export class AppModule {}
```

`GitHubIntegrationModule` pulls in its own dependencies (`GitModule`, `GitHubModule`, `HitlModule`, `OAuthModule`, `RemoteClientModule`) — you do not need to import those manually, but they must be installed as dependencies of your app.

You'll also need a GitHub OAuth app configured; see `SETUP.md`.

## How It Works

`ConnectGitHubWorkflow` is a state machine that composes smaller pieces:

1. **OAuth** — uses `@loopstack/oauth-module` to obtain a GitHub access token for the user.
2. **Repo choice** — asks (via `@loopstack/hitl`) whether to create a new repo or link an existing one.
3. **Repo operation** — calls `@loopstack/github-module` to create the repo or fetch metadata for the chosen one.
4. **Remote configuration** — uses `@loopstack/git-module` tools (`git-remote-configure`, `git-config-user`) to wire the workspace git config.
5. **Divergence handling** — if the remote branch exists and has commits, the workflow asks the user how to resolve (rebase / reset / cancel).
6. **Push** — `git-push` finalises.

Inspect `src/workflows/connect-github/connect-github.workflow.ts` for the full state transitions.

### Running the workflow

Trigger it like any other Loopstack workflow (via the Studio, an API call, or programmatically):

```ts
import { ConnectGitHubWorkflow } from '@loopstack/github-integration';

// inject into a service or call via the workflow API; see @loopstack/core docs
```

## Public API

- **Module:** `GitHubIntegrationModule`
- **Workflow:** `ConnectGitHubWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core` — framework
- `@loopstack/git-module` — git operations on the workspace
- `@loopstack/github-module` — GitHub REST API client
- `@loopstack/hitl` — user prompts for decision points
- `@loopstack/oauth-module` — GitHub OAuth flow
- `@loopstack/remote-client` — dispatches git commands to the remote agent

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
