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
async authRequired() {
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
}

needsAuth(): boolean {
  return !!this.requiresAuthentication;
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
async authCompleted(payload: { workflowId: string }) {
  await this.repository.save(
    LinkDocument,
    {
      status: 'success',
      label: 'GitHub authentication completed',
      workflowId: payload.workflowId,
      embed: true,
      expanded: false,
    },
    { id: `link_${payload.workflowId}` },
  );
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
4. If `stop_reason === 'tool_use'`, delegates tool calls via `DelegateToolCalls` and collects results with `UpdateToolResult`
5. If a tool returns an auth error, the LLM calls `authenticateGitHub` which launches OAuth
6. Loops back to wait for the next user message

**Agent loop pattern:**

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn() {
  const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
    system: `You are a helpful GitHub assistant with access to repository, issue, PR, code, actions,
and search tools. When a tool returns an unauthorized error, use authenticateGitHub
to let the user sign in, then retry. Be concise and format results using markdown.`,
    claude: { model: 'claude-sonnet-4-6' },
    messagesSearchTag: 'message',
    tools: [
      'gitHubListRepos', 'gitHubGetRepo', 'gitHubCreateRepo', 'gitHubListBranches',
      'gitHubListIssues', 'gitHubGetIssue', 'gitHubCreateIssue', 'gitHubCreateIssueComment',
      'gitHubListPullRequests', 'gitHubGetPullRequest', 'gitHubCreatePullRequest',
      'gitHubMergePullRequest', 'gitHubListPrReviews',
      'gitHubGetFileContent', 'gitHubCreateOrUpdateFile', 'gitHubListDirectory', 'gitHubGetCommit',
      'gitHubListWorkflowRuns', 'gitHubTriggerWorkflow', 'gitHubGetWorkflowRun',
      'gitHubSearchCode', 'gitHubSearchRepos', 'gitHubSearchIssues',
      'gitHubGetAuthenticatedUser', 'gitHubListUserOrgs',
      'authenticateGitHub',
    ],
  });
  this.llmResult = result.data;
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls() {
  const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
    message: this.llmResult!,
    document: ClaudeMessageDocument,
    callback: { transition: 'toolResultReceived' },
  });
  this.delegateResult = result.data;
}

hasToolCalls(): boolean {
  return this.llmResult?.stop_reason === 'tool_use';
}
```

This is the easiest way to interactively test every GitHub tool -- just ask the agent to perform any GitHub operation.

## Setup

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

- `@loopstack/common` - Core framework decorators (`BaseWorkflow`, `@Workflow`, `@Initial`, `@Transition`, `@Final`, `@Guard`, `@InjectTool`, `@InjectWorkflow`, `CallbackSchema`, `ToolResult`)
- `@loopstack/core` - Provides `LinkDocument`, `MarkdownDocument`, and `MessageDocument`
- `@loopstack/claude-module` - Claude integration (`ClaudeGenerateText`, `ClaudeMessageDocument`, `DelegateToolCalls`, `UpdateToolResult`)
- `@loopstack/oauth-module` - OAuth infrastructure (`OAuthWorkflow`)
- `@loopstack/github-module` - All 25 GitHub tools

## About

Author: [Jakob Klippel](https://github.com/loopstack-ai)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
