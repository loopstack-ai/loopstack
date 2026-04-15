# @loopstack/github-module

> GitHub integration for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a GitHub OAuth 2.0 provider implementation and 25 tools across 7 domains for interacting with GitHub APIs. It registers a GitHub OAuth provider with `@loopstack/oauth-module`, enabling GitHub authentication in any Loopstack workflow, and provides tools for repositories, issues, pull requests, content/git ops, actions, search, and users/orgs.

## Overview

The GitHub Module includes a **provider implementation** for `@loopstack/oauth-module`. It implements the `OAuthProviderInterface` and self-registers with the `OAuthProviderRegistry` on startup. Once registered, the generic OAuth workflow can handle `provider: 'github'` automatically.

By using this module, you'll be able to:

- Authenticate users with their GitHub account via OAuth 2.0
- Manage repositories, branches, issues, and pull requests programmatically
- Read and write file content, list directories, and inspect commits
- Trigger and monitor GitHub Actions workflow runs
- Search code, repositories, and issues across GitHub
- Access user profiles and organization memberships

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

This module requires `@loopstack/oauth-module` as a peer dependency.

## How It Works

### Provider Registration

The `GitHubOAuthProvider` implements `OnModuleInit` and registers itself with the `OAuthProviderRegistry` at startup:

```typescript
onModuleInit(): void {
  this.providerRegistry.register(this);
}
```

After registration, the generic `OAuthWorkflow` from `@loopstack/oauth-module` can handle authentication for `provider: 'github'`.

### Provider Details

| Property        | Value                                         |
| --------------- | --------------------------------------------- |
| `providerId`    | `'github'`                                    |
| `defaultScopes` | `repo`, `user`, `workflow`, `read:org`        |
| Auth endpoint   | `https://github.com/login/oauth/authorize`    |
| Token endpoint  | `https://github.com/login/oauth/access_token` |

> **Note:** GitHub OAuth tokens do not expire and do not support refresh. The `refreshToken()` method throws an error.

### Environment Variables

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_OAUTH_REDIRECT_URI=/oauth/callback
```

## Tools

### Repositories

- **GitHubListReposTool** — List repositories for the authenticated user
- **GitHubGetRepoTool** — Get detailed repository information
- **GitHubCreateRepoTool** — Create a new repository
- **GitHubListBranchesTool** — List branches for a repository

### Issues

- **GitHubListIssuesTool** — List issues for a repository
- **GitHubGetIssueTool** — Get detailed issue information
- **GitHubCreateIssueTool** — Create a new issue
- **GitHubCreateIssueCommentTool** — Comment on an issue or pull request

### Pull Requests

- **GitHubListPullRequestsTool** — List pull requests for a repository
- **GitHubGetPullRequestTool** — Get detailed pull request information
- **GitHubCreatePullRequestTool** — Create a new pull request
- **GitHubMergePullRequestTool** — Merge a pull request
- **GitHubListPrReviewsTool** — List reviews on a pull request

### Content / Git Ops

- **GitHubGetFileContentTool** — Get file content (base64-decoded)
- **GitHubCreateOrUpdateFileTool** — Create or update a file
- **GitHubListDirectoryTool** — List directory contents
- **GitHubGetCommitTool** — Get commit details

### Actions

- **GitHubListWorkflowRunsTool** — List workflow runs
- **GitHubTriggerWorkflowTool** — Trigger a workflow dispatch
- **GitHubGetWorkflowRunTool** — Get workflow run details

### Search

- **GitHubSearchCodeTool** — Search code across repositories
- **GitHubSearchReposTool** — Search repositories
- **GitHubSearchIssuesTool** — Search issues and pull requests

### Users & Orgs

- **GitHubGetAuthenticatedUserTool** — Get authenticated user profile
- **GitHubListUserOrgsTool** — List user organizations

## Usage in Workflows

Once registered, any workflow can trigger GitHub authentication by launching the OAuth workflow with `provider: 'github'`:

```typescript
@InjectWorkflow() oAuth: OAuthWorkflow;

// In a transition method:
const result = await this.oAuth.run(
  { provider: 'github', scopes: ['repo', 'read:org', 'workflow'] },
  { alias: 'oAuth', callback: { transition: 'authCompleted' } },
);

await this.repository.save(
  LinkDocument,
  {
    label: 'GitHub authentication required',
    workflowId: result.workflowId,
    embed: true,
    expanded: true,
  },
  { id: `link_${result.workflowId}` },
);
```

See `@loopstack/oauth-module` and `@loopstack/github-oauth-example` for complete usage examples.

## Dependencies

- `@loopstack/oauth-module` — Provides `OAuthProviderRegistry`, `OAuthProviderInterface`, and `OAuthTokenSet`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples see the [Loopstack Registry](https://loopstack.ai/registry)
