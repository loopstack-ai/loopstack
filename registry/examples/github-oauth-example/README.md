# @loopstack/github-oauth-example

> An example module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module demonstrates how to build workflows that interact with the GitHub API using OAuth authentication. It includes two workflows: a structured overview that fetches repository data, and an interactive chat agent powered by an LLM that can use all 25 GitHub tools.

## Workflows

### GitHub Repos Overview (`gitHubReposOverview`)

A multi-step workflow that fetches and displays a comprehensive overview of a GitHub repository. If the user is not authenticated, it launches the OAuth sub-workflow and retries automatically.

**Inputs:** `owner` (default: `octocat`), `repo` (default: `Hello-World`)

**Flow:**

```
start -> fetch_user -> fetch_orgs -> fetch_repo_details -> fetch_issues_prs
  -> fetch_content_actions -> fetch_search -> display_results -> end
```

With OAuth branching:

```
fetch_user -> (unauthorized) -> auth_required -> awaiting_auth
                                                    |
                                              auth_completed -> start (retry)
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

An interactive chat agent that gives an LLM access to all 25 GitHub tools. The agent can manage repositories, issues, pull requests, browse code, check CI/CD status, search across GitHub, and handle OAuth automatically.

**How it works:**

1. Sets up a system prompt describing available GitHub capabilities
2. Waits for user input via a chat prompt
3. Sends the conversation to the LLM with all GitHub tools available
4. Executes any tool calls the LLM makes
5. If a tool returns an auth error, launches OAuth and resumes after authentication
6. Loops back to wait for the next user message

This is the easiest way to interactively test every GitHub tool — just ask the agent to perform any GitHub operation.

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
OPENAI_API_KEY=your-openai-api-key
```

## Dependencies

- `@loopstack/core` — Core framework functionality including `ExecuteWorkflowAsync`
- `@loopstack/ai-module` — LLM integration (`AiGenerateText`, `DelegateToolCall`)
- `@loopstack/oauth-module` — OAuth infrastructure (`OAuthTokenStore`, `OAuthWorkflow`)
- `@loopstack/github-module` — All 25 GitHub tools and the GitHub OAuth provider
- `@loopstack/core-ui-module` — `CreateDocument`, `LinkDocument`, `MarkdownDocument`
- `@loopstack/create-chat-message-tool` — `CreateChatMessage`

## About

Author: [Jakob Klippel](https://github.com/loopstack-ai)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
