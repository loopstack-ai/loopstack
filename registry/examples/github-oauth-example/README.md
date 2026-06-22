---
title: GitHub OAuth Example
description: Example workflows using GitHub API with OAuth — structured repo overview and interactive Claude chat agent with 25 GitHub tools
---

# @loopstack/github-oauth-example

> An example module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module demonstrates how to build workflows that interact with the GitHub API using OAuth authentication. It includes two workflows: a structured overview that fetches repository data, and an interactive chat agent powered by Claude that can use all 25 GitHub tools.

## Workflows

### GitHub Repos Overview (`gitHubReposOverview`)

A multi-step workflow that fetches and displays a comprehensive overview of a GitHub repository. If the user is not authenticated, it launches the OAuth sub-workflow and retries automatically.

**Inputs:** `owner` (default: `octocat`), `repo` (default: `Hello-World`)

**Flow:**

```
start -> user_fetched -> orgs_fetched -> repo_fetched -> issues_prs_fetched
  -> content_actions_fetched -> search_done -> end
```

With OAuth branching:

```
user_fetched -> (unauthorized via @Guard) -> awaiting_auth
                                                |
                                          auth_completed -> start (retry)
```

**Key patterns:**

The workflow uses `@Guard` to check if authentication is needed and routes to the OAuth flow:

```typescript
@Transition({ from: 'user_fetched', to: 'awaiting_auth', priority: 10 })
@Guard('needsAuth')
async authRequired(state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
  await this.oAuthWorkflow.run(
    { provider: 'github', scopes: ['repo', 'read:org', 'workflow'] },
    { callback: { transition: 'authCompleted' }, show: 'inline', label: 'GitHub authentication required' },
  );
  return state;
}

needsAuth(state: GitHubReposOverviewState): boolean {
  return !!state.requiresAuthentication;
}
```

The auth callback uses `wait: true` with `CallbackSchema` to receive the OAuth completion signal:

```typescript
@Transition({
  from: 'awaiting_auth',
  to: 'start',
  wait: true,
  schema: CallbackSchema,
})
async authCompleted(state: GitHubReposOverviewState, _payload: { workflowId: string }): Promise<GitHubReposOverviewState> {
  return state;
}
```

**Tools exercised in the workflow:**

| Category      | Tool                         | Used in workflow |
| ------------- | ---------------------------- | ---------------- |
| Users         | `gitHubGetAuthenticatedUser` | Yes              |
| Users         | `gitHubListUserOrgs`         | Yes              |
| Repos         | `gitHubListRepos`            | No               |
| Repos         | `gitHubGetRepo`              | Yes              |
| Repos         | `gitHubCreateRepo`           | No               |
| Repos         | `gitHubListBranches`         | Yes              |
| Issues        | `gitHubListIssues`           | Yes              |
| Issues        | `gitHubGetIssue`             | No               |
| Issues        | `gitHubCreateIssue`          | No               |
| Issues        | `gitHubCreateIssueComment`   | No               |
| Pull Requests | `gitHubListPullRequests`     | Yes              |
| Pull Requests | `gitHubGetPullRequest`       | No               |
| Pull Requests | `gitHubCreatePullRequest`    | No               |
| Pull Requests | `gitHubMergePullRequest`     | No               |
| Pull Requests | `gitHubListPrReviews`        | No               |
| Content       | `gitHubGetFileContent`       | No               |
| Content       | `gitHubCreateOrUpdateFile`   | No               |
| Content       | `gitHubListDirectory`        | Yes              |
| Content       | `gitHubGetCommit`            | No               |
| Actions       | `gitHubListWorkflowRuns`     | Yes              |
| Actions       | `gitHubTriggerWorkflow`      | No               |
| Actions       | `gitHubGetWorkflowRun`       | No               |
| Search        | `gitHubSearchCode`           | Yes              |
| Search        | `gitHubSearchRepos`          | No               |
| Search        | `gitHubSearchIssues`         | No               |

All 25 tools are injected and available; 9 are called directly by the workflow transitions. The remaining 16 (including all write operations) are available for use but not exercised automatically.

### GitHub Agent (`gitHubAgent`)

An interactive chat agent that gives Claude access to all 25 GitHub tools. The agent can manage repositories, issues, pull requests, browse code, check CI/CD status, search across GitHub, and handle OAuth automatically via the `AuthenticateGitHubTask` custom tool.

**How it works:**

1. Sets up a hidden system message describing available GitHub capabilities
2. Waits for user input via a `wait: true` transition
3. Sends the conversation to Claude with all 25 GitHub tools plus `authenticateGitHub`
4. If `message.stopReason === 'tool_use'`, delegates tool calls via `LlmDelegateToolCallsTool` and collects results with `LlmUpdateToolResultTool`
5. If a tool returns an auth error, the LLM calls `authenticateGitHub` which launches OAuth
6. Loops back to wait for the next user message

**Agent loop pattern:**

All tools are injected via the constructor. Provider, model, system prompt, and tool list are passed at call time via `{ config: { ... } }`:

```typescript
constructor(
  private readonly llmGenerateText: LlmGenerateTextTool,
  private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
  private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
  private readonly authenticateGitHub: AuthenticateGitHubTask,
  // ... all 25 GitHub tools ...
  private readonly oAuth: OAuthWorkflow,
) {
  super();
}

@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn(state: GitHubAgentState): Promise<GitHubAgentState> {
  const result = await this.llmGenerateText.call(
    {},
    {
      config: {
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        system: `You are a helpful GitHub assistant with access to repository, issue, PR, code, actions,
and search tools. When a tool returns an unauthorized error, use authenticateGitHub
to let the user sign in, then retry. Be concise and format results using markdown.`,
        tools: [
          'github_list_repos', 'github_get_repo', 'github_create_repo', 'github_list_branches',
          'github_list_issues', 'github_get_issue', 'github_create_issue', 'github_create_issue_comment',
          'github_list_pull_requests', 'github_get_pull_request', 'github_create_pull_request',
          'github_merge_pull_request', 'github_list_pr_reviews',
          'github_get_file_content', 'github_create_or_update_file', 'github_list_directory', 'github_get_commit',
          'github_list_workflow_runs', 'github_trigger_workflow', 'github_get_workflow_run',
          'github_search_code', 'github_search_repos', 'github_search_issues',
          'github_get_authenticated_user', 'github_list_user_orgs',
          'authenticate_github',
        ],
      },
    },
  );
  return { ...state, llmResult: result.data };
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: GitHubAgentState): Promise<GitHubAgentState> {
  const result = await this.llmDelegateToolCalls.call({
    message: state.llmResult!.message,
    callback: { transition: 'toolResultReceived' },
  });
  return { ...state, delegateResult: result.data };
}

hasToolCalls(state: GitHubAgentState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

This is the easiest way to interactively test every GitHub tool -- just ask the agent to perform any GitHub operation.

## Setup

Register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { GitHubAgentWorkflow, GitHubExampleModule, GitHubReposOverviewWorkflow } from '@loopstack/github-oauth-example';

@StudioApp({
  title: 'GitHub OAuth Example',
  workflows: [GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
})
@Module({
  imports: [GitHubExampleModule],
})
export class MyAppModule {}
```

### Environment Variables

Create a GitHub OAuth App at https://github.com/settings/developers and configure:

```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/oauth/callback
```

For the GitHub Agent workflow, you also need an LLM API key:

```bash
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Dependencies

- `@loopstack/common` - Core workflow/runtime APIs (`BaseWorkflow`, `@Workflow`, `@Transition`, `@Guard`, `CallbackSchema`, `ToolResult`, `MarkdownDocument`, `MessageDocument`)
- `@loopstack/llm-provider-module` - LLM adapter tools (`LlmGenerateTextTool`, `LlmMessageDocument`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`)
- `@loopstack/oauth-module` - OAuth infrastructure (`OAuthWorkflow`)
- `@loopstack/github-module` - All 25 GitHub tools

## About

Author: [Jakob Klippel](https://github.com/loopstack-ai)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
