# @loopstack/github-module

GitHub integration for the Loopstack automation framework. Provides a GitHub OAuth provider and 25 tools across 7 domains: repositories, issues, pull requests, content/git ops, actions, search, and users/orgs.

## Installation

```bash
loopstack add @loopstack/github-module
```

## Configuration

Set the following environment variables:

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
