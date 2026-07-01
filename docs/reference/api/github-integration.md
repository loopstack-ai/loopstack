---
title: API: @loopstack/github-integration
description: Public API reference for @loopstack/github-integration
includeInLlmsFullTxt: false
---

# API: @loopstack/github-integration

## Classes

### ConnectGitHubWorkflow

Workflow that connects a workspace to a GitHub repository: it authenticates via OAuth, lets the user
create or link a repo, configures git remotes and user identity, resolves branch divergence through HITL
prompts, and pushes.

```ts
import { ConnectGitHubWorkflow } from '@loopstack/github-integration';
```

**Provided by:** `GitHubIntegrationModule`

```ts
export class ConnectGitHubWorkflow extends BaseWorkflow {
  constructor(
    gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool,
    gitHubCreateRepo: GitHubCreateRepoTool,
    gitHubListRepos: GitHubListReposTool,
    gitRemoteConfigure: GitRemoteConfigureTool,
    gitConfigUser: GitConfigUserTool,
    gitStatus: GitStatusTool,
    gitPush: GitPushTool,
    gitFetch: GitFetchTool,
    bash: BashTool,
    oAuth: OAuthWorkflow,
    askUser: AskUserWorkflow,
    tokenStore: OAuthTokenStore,
    clientMessageService: ClientMessageService,
  );
  start(_state: ConnectGitHubState): Promise<void>;
  launchOAuth(_state: ConnectGitHubState): Promise<void>;
  authCompleted(_state: ConnectGitHubState, _input: TransitionInput): Promise<void>;
  askCreateOrLink(_state: ConnectGitHubState): Promise<void>;
  choiceReceived(
    state: ConnectGitHubState,
    input: TransitionInput<{
      answer: string;
    }>,
  ): Promise<void>;
  createRepo(
    state: ConnectGitHubState,
    input: TransitionInput<{
      answer: string;
    }>,
  ): Promise<void>;
  repoSelected(
    state: ConnectGitHubState,
    input: TransitionInput<{
      answer: string;
    }>,
  ): void;
  checkForUncommittedChanges(state: ConnectGitHubState): Promise<void>;
  skipCommitCheck(_state: ConnectGitHubState): void;
  askCommitChanges(_state: ConnectGitHubState): Promise<void>;
  uncommittedChangesHandled(
    state: ConnectGitHubState,
    input: TransitionInput<{
      answer: string;
    }>,
  ): Promise<void>;
  setupRemote(state: ConnectGitHubState, ctx: RunContext): Promise<void>;
  pushDirectly(state: ConnectGitHubState, ctx: RunContext): Promise<void>;
  askSyncStrategy(state: ConnectGitHubState): Promise<void>;
  syncStrategyChosen(
    state: ConnectGitHubState,
    input: TransitionInput<{
      answer: string;
    }>,
    ctx: RunContext,
  ): Promise<void>;
  showSuccess(state: ConnectGitHubState, ctx: RunContext): Promise<void>;
}
```

### GitHubIntegrationModule

NestJS module that provides `ConnectGitHubWorkflow` — a guided end-to-end workflow that authenticates via
OAuth, creates or links a GitHub repo, configures git remotes, resolves branch divergence via HITL, and pushes.

Registration:

- `GitHubIntegrationModule` — bare import; it internally imports `GitModule`, `GitHubModule`, `HitlModule`,
  and `OAuthModule`, so you do not import those yourself. No static configuration methods exist.

Requires: the peer packages `@loopstack/git-module`, `@loopstack/github-module`, `@loopstack/hitl`,
`@loopstack/oauth-module`, and `@loopstack/remote-client` must be installed, plus a configured GitHub OAuth app
(client ID/secret via `GitHubModule`'s env vars) and the `RemoteClient` infrastructure required by `GitModule`.

```ts
import { GitHubIntegrationModule } from '@loopstack/github-integration';
```

```ts
export class GitHubIntegrationModule {}
```
