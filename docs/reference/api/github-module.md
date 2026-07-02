---
title: 'API: @loopstack/github-module'
description: 'Public API reference for @loopstack/github-module'
includeInLlmsFullTxt: false
---

# API: @loopstack/github-module

## Classes

### GitHubCreateIssueCommentTool

Tool that adds a comment to a GitHub issue or pull request.

```ts
import { GitHubCreateIssueCommentTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubCreateIssueCommentTool extends BaseTool<
  GitHubCreateIssueCommentArgs,
  object,
  GitHubCreateIssueCommentResult
> {
  protected handle(
    args: GitHubCreateIssueCommentArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubCreateIssueCommentResult>>;
}
```

### GitHubCreateIssueTool

Tool that creates a new issue in a GitHub repository.

```ts
import { GitHubCreateIssueTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubCreateIssueTool extends BaseTool<GitHubCreateIssueArgs, object, GitHubCreateIssueResult> {
  protected handle(args: GitHubCreateIssueArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubCreateIssueResult>>;
}
```

### GitHubCreateOrUpdateFileTool

Tool that creates or updates a file in a GitHub repository, base64-encoding the
provided text and committing it. Pass the existing file `sha` to update in place.

```ts
import { GitHubCreateOrUpdateFileTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubCreateOrUpdateFileTool extends BaseTool<
  GitHubCreateOrUpdateFileArgs,
  object,
  GitHubCreateOrUpdateFileResult
> {
  protected handle(
    args: GitHubCreateOrUpdateFileArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubCreateOrUpdateFileResult>>;
}
```

### GitHubCreatePullRequestTool

Tool that opens a new pull request in a GitHub repository from a head branch into a base branch.

```ts
import { GitHubCreatePullRequestTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubCreatePullRequestTool extends BaseTool<
  GitHubCreatePullRequestArgs,
  object,
  GitHubCreatePullRequestResult
> {
  protected handle(
    args: GitHubCreatePullRequestArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubCreatePullRequestResult>>;
}
```

### GitHubCreateRepoTool

Tool that creates a new GitHub repository for the authenticated user.

```ts
import { GitHubCreateRepoTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubCreateRepoTool extends BaseTool<GitHubCreateRepoArgs, object, GitHubCreateRepoResult> {
  protected handle(args: GitHubCreateRepoArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubCreateRepoResult>>;
}
```

### GitHubGetAuthenticatedUserTool

Tool that fetches the profile of the currently authenticated GitHub user.

```ts
import { GitHubGetAuthenticatedUserTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetAuthenticatedUserTool extends BaseTool<
  GitHubGetAuthenticatedUserArgs,
  object,
  GitHubGetAuthenticatedUserResult
> {
  protected handle(
    _args: GitHubGetAuthenticatedUserArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubGetAuthenticatedUserResult>>;
}
```

### GitHubGetCommitTool

Tool that fetches detailed information about a single commit in a GitHub repository,
including diff stats and changed files.

```ts
import { GitHubGetCommitTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetCommitTool extends BaseTool<GitHubGetCommitArgs, object, GitHubGetCommitResult> {
  protected handle(args: GitHubGetCommitArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetCommitResult>>;
}
```

### GitHubGetFileContentTool

Tool that reads the content of a file from a GitHub repository, decoding the
base64 payload returned by the API into plain text.

```ts
import { GitHubGetFileContentTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetFileContentTool extends BaseTool<GitHubGetFileContentArgs, object, GitHubGetFileContentResult> {
  protected handle(args: GitHubGetFileContentArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetFileContentResult>>;
}
```

### GitHubGetIssueTool

Tool that fetches detailed information about a single GitHub issue.

```ts
import { GitHubGetIssueTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetIssueTool extends BaseTool<GitHubGetIssueArgs, object, GitHubGetIssueResult> {
  protected handle(args: GitHubGetIssueArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetIssueResult>>;
}
```

### GitHubGetPullRequestTool

Tool that fetches detailed information about a single GitHub pull request.

```ts
import { GitHubGetPullRequestTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetPullRequestTool extends BaseTool<GitHubGetPullRequestArgs, object, GitHubGetPullRequestResult> {
  protected handle(args: GitHubGetPullRequestArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetPullRequestResult>>;
}
```

### GitHubGetRepoTool

Tool that fetches detailed information about a single GitHub repository.
Takes an `owner` and `repo` and returns full repository metadata.

```ts
import { GitHubGetRepoTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetRepoTool extends BaseTool<GitHubGetRepoArgs, object, GitHubGetRepoResult> {
  protected handle(args: GitHubGetRepoArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetRepoResult>>;
}
```

### GitHubGetWorkflowRunTool

Tool that fetches detailed information about a single GitHub Actions workflow run.

```ts
import { GitHubGetWorkflowRunTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubGetWorkflowRunTool extends BaseTool<GitHubGetWorkflowRunArgs, object, GitHubGetWorkflowRunResult> {
  protected handle(args: GitHubGetWorkflowRunArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetWorkflowRunResult>>;
}
```

### GitHubListBranchesTool

Tool that lists branches for a GitHub repository.

```ts
import { GitHubListBranchesTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListBranchesTool extends BaseTool<GitHubListBranchesArgs, object, GitHubListBranchesResult> {
  protected handle(args: GitHubListBranchesArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubListBranchesResult>>;
}
```

### GitHubListDirectoryTool

Tool that lists the contents of a directory in a GitHub repository.

```ts
import { GitHubListDirectoryTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListDirectoryTool extends BaseTool<GitHubListDirectoryArgs, object, GitHubListDirectoryResult> {
  protected handle(args: GitHubListDirectoryArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubListDirectoryResult>>;
}
```

### GitHubListIssuesTool

Tool that lists issues for a GitHub repository, with state, label and assignee filters.
Note that the GitHub API also returns pull requests, marked via `isPullRequest`.

```ts
import { GitHubListIssuesTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListIssuesTool extends BaseTool<GitHubListIssuesArgs, object, GitHubListIssuesResult> {
  protected handle(args: GitHubListIssuesArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubListIssuesResult>>;
}
```

### GitHubListPrReviewsTool

Tool that lists reviews submitted on a GitHub pull request.

```ts
import { GitHubListPrReviewsTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListPrReviewsTool extends BaseTool<GitHubListPrReviewsArgs, object, GitHubListPrReviewsResult> {
  protected handle(args: GitHubListPrReviewsArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubListPrReviewsResult>>;
}
```

### GitHubListPullRequestsTool

Tool that lists pull requests for a GitHub repository, with state and base-branch filters.

```ts
import { GitHubListPullRequestsTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListPullRequestsTool extends BaseTool<
  GitHubListPullRequestsArgs,
  object,
  GitHubListPullRequestsResult
> {
  protected handle(
    args: GitHubListPullRequestsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubListPullRequestsResult>>;
}
```

### GitHubListReposTool

Tool that lists repositories for the authenticated GitHub user, with visibility,
sort and paging options.

```ts
import { GitHubListReposTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListReposTool extends BaseTool<GitHubListReposArgs, object, GitHubListReposResult> {
  protected handle(args: GitHubListReposArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubListReposResult>>;
}
```

### GitHubListUserOrgsTool

Tool that lists the organizations the authenticated GitHub user belongs to.

```ts
import { GitHubListUserOrgsTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListUserOrgsTool extends BaseTool<GitHubListUserOrgsArgs, object, GitHubListUserOrgsResult> {
  protected handle(args: GitHubListUserOrgsArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubListUserOrgsResult>>;
}
```

### GitHubListWorkflowRunsTool

Tool that lists GitHub Actions workflow runs for a repository, with branch and status filters.

```ts
import { GitHubListWorkflowRunsTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubListWorkflowRunsTool extends BaseTool<
  GitHubListWorkflowRunsArgs,
  object,
  GitHubListWorkflowRunsResult
> {
  protected handle(
    args: GitHubListWorkflowRunsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubListWorkflowRunsResult>>;
}
```

### GitHubMergePullRequestTool

Tool that merges a GitHub pull request using the chosen merge method.

```ts
import { GitHubMergePullRequestTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubMergePullRequestTool extends BaseTool<
  GitHubMergePullRequestArgs,
  object,
  GitHubMergePullRequestResult
> {
  protected handle(
    args: GitHubMergePullRequestArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubMergePullRequestResult>>;
}
```

### GitHubModule

NestJS module that provides the GitHub OAuth provider (`GitHubOAuthProvider`) and 25 GitHub API tools
for repositories, issues, pull requests, file content/git ops, actions/workflow runs, search, and users/orgs.

Registration:

- `GitHubModule` — bare import; it internally imports `OAuthModule` and registers `GitHubOAuthProvider`
  plus all tools. No static configuration methods exist.

Requires: a configured GitHub OAuth app via the environment variables `GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`, and `GITHUB_OAUTH_REDIRECT_URI`; without valid OAuth credentials the tools
return `{ error: 'unauthorized' }`.

```ts
import { GitHubModule } from '@loopstack/github-module';
```

```ts
export class GitHubModule {}
```

### GitHubSearchCodeTool

Tool that searches for code across GitHub repositories using the GitHub search syntax.

```ts
import { GitHubSearchCodeTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubSearchCodeTool extends BaseTool<GitHubSearchCodeArgs, object, GitHubSearchCodeResult> {
  protected handle(args: GitHubSearchCodeArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubSearchCodeResult>>;
}
```

### GitHubSearchIssuesTool

Tool that searches for issues and pull requests across GitHub using the GitHub search syntax.

```ts
import { GitHubSearchIssuesTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubSearchIssuesTool extends BaseTool<GitHubSearchIssuesArgs, object, GitHubSearchIssuesResult> {
  protected handle(args: GitHubSearchIssuesArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubSearchIssuesResult>>;
}
```

### GitHubSearchReposTool

Tool that searches for repositories on GitHub using the GitHub search syntax.

```ts
import { GitHubSearchReposTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubSearchReposTool extends BaseTool<GitHubSearchReposArgs, object, GitHubSearchReposResult> {
  protected handle(args: GitHubSearchReposArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubSearchReposResult>>;
}
```

### GitHubTriggerWorkflowTool

Tool that triggers a GitHub Actions workflow dispatch event on a given ref.

```ts
import { GitHubTriggerWorkflowTool } from '@loopstack/github-module';
```

**Provided by:** `GitHubModule`

```ts
export class GitHubTriggerWorkflowTool extends BaseTool<
  GitHubTriggerWorkflowArgs,
  object,
  GitHubTriggerWorkflowResult
> {
  protected handle(
    args: GitHubTriggerWorkflowArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubTriggerWorkflowResult>>;
}
```

## Type Aliases

### GitHubCreateIssueArgs

Args for `GitHubCreateIssueTool`: the repository `owner`, `repo`, issue `title` and
optional `body`, `labels` and `assignees`.

```ts
import { GitHubCreateIssueArgs } from '@loopstack/github-module';
```

```ts
export type GitHubCreateIssueArgs = z.infer<typeof inputSchema>;
```

### GitHubCreateIssueCommentArgs

Args for `GitHubCreateIssueCommentTool`: the repository `owner`, `repo`,
`issueNumber` (issue or pull request) and comment `body`.

```ts
import { GitHubCreateIssueCommentArgs } from '@loopstack/github-module';
```

```ts
export type GitHubCreateIssueCommentArgs = z.infer<typeof inputSchema>;
```

### GitHubCreateIssueCommentResult

Result for `GitHubCreateIssueCommentTool`: the created `comment` summary, or an `error`.

```ts
import { GitHubCreateIssueCommentResult } from '@loopstack/github-module';
```

```ts
export type GitHubCreateIssueCommentResult =
  | {
      comment: {
        id: number;
        htmlUrl: string;
        createdAt: string;
        user: string;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubCreateIssueResult

Result for `GitHubCreateIssueTool`: the created `issue` summary, or an `error`.

```ts
import { GitHubCreateIssueResult } from '@loopstack/github-module';
```

```ts
export type GitHubCreateIssueResult =
  | {
      issue: {
        id: number;
        number: number;
        title: string;
        htmlUrl: string;
        state: string;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubCreateOrUpdateFileArgs

Args for `GitHubCreateOrUpdateFileTool`: the repository `owner`, `repo`, file `path`,
plain-text `content`, commit `message`, optional `branch` and `sha` of the file being replaced.

```ts
import { GitHubCreateOrUpdateFileArgs } from '@loopstack/github-module';
```

```ts
export type GitHubCreateOrUpdateFileArgs = z.infer<typeof inputSchema>;
```

### GitHubCreateOrUpdateFileResult

Result for `GitHubCreateOrUpdateFileTool`: the written `file` and resulting `commit`, or an `error`.

```ts
import { GitHubCreateOrUpdateFileResult } from '@loopstack/github-module';
```

```ts
export type GitHubCreateOrUpdateFileResult =
  | {
      file: {
        name: string;
        path: string;
        sha: string;
        htmlUrl: string;
      };
      commit: {
        sha: string;
        message: string;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubCreatePullRequestArgs

Args for `GitHubCreatePullRequestTool`: the repository `owner`, `repo`, `title`,
`head` and `base` branches, optional `body` and `draft` flag.

```ts
import { GitHubCreatePullRequestArgs } from '@loopstack/github-module';
```

```ts
export type GitHubCreatePullRequestArgs = z.input<typeof inputSchema>;
```

### GitHubCreatePullRequestResult

Result for `GitHubCreatePullRequestTool`: the created `pullRequest` summary, or an `error`.

```ts
import { GitHubCreatePullRequestResult } from '@loopstack/github-module';
```

```ts
export type GitHubCreatePullRequestResult =
  | {
      pullRequest: {
        id: number;
        number: number;
        title: string;
        htmlUrl: string;
        state: string;
        draft: boolean;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubCreateRepoArgs

Args for `GitHubCreateRepoTool`: repository `name`, optional `description`,
`private` visibility and `autoInit` to seed an initial commit.

```ts
import { GitHubCreateRepoArgs } from '@loopstack/github-module';
```

```ts
export type GitHubCreateRepoArgs = z.input<typeof inputSchema>;
```

### GitHubCreateRepoResult

Result for `GitHubCreateRepoTool`: the created `repo` summary, or an `error`.

```ts
import { GitHubCreateRepoResult } from '@loopstack/github-module';
```

```ts
export type GitHubCreateRepoResult = {
  repo?: {
    id: number;
    fullName: string;
    name: string;
    htmlUrl: string;
    private: boolean;
    defaultBranch: string;
  };
  error?: string;
  message?: string;
};
```

### GitHubGetAuthenticatedUserArgs

Args for `GitHubGetAuthenticatedUserTool`: an empty object; the user is resolved from the token.

```ts
import { GitHubGetAuthenticatedUserArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetAuthenticatedUserArgs = z.infer<typeof inputSchema>;
```

### GitHubGetAuthenticatedUserResult

Result for `GitHubGetAuthenticatedUserTool`: a `user` profile with login, name, email,
avatar and counts, or an `error`.

```ts
import { GitHubGetAuthenticatedUserResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetAuthenticatedUserResult = {
  user?: {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatarUrl: string;
    htmlUrl: string;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: string;
  };
  error?: string;
  message?: string;
};
```

### GitHubGetCommitArgs

Args for `GitHubGetCommitTool`: the repository `owner`, `repo` and `ref` (commit SHA, branch or tag).

```ts
import { GitHubGetCommitArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetCommitArgs = z.infer<typeof inputSchema>;
```

### GitHubGetCommitResult

Result for `GitHubGetCommitTool`: a `commit` object with author, committer, diff `stats`
and changed `files`, or an `error`.

```ts
import { GitHubGetCommitResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetCommitResult =
  | {
      commit: {
        sha: string;
        message: string;
        author: {
          name: string;
          email: string;
          date: string;
          login: string | null;
        };
        committer: {
          name: string;
          date: string;
        };
        htmlUrl: string;
        stats: {
          additions: number;
          deletions: number;
          total: number;
        };
        files: Array<{
          filename: string;
          status: string;
          additions: number;
          deletions: number;
          changes: number;
        }>;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubGetFileContentArgs

Args for `GitHubGetFileContentTool`: the repository `owner`, `repo`, file `path`
and optional `ref` (branch, tag or commit SHA).

```ts
import { GitHubGetFileContentArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetFileContentArgs = z.infer<typeof inputSchema>;
```

### GitHubGetFileContentResult

Result for `GitHubGetFileContentTool`: a `file` object with decoded text `content`
plus path, sha and size, or an `error`.

```ts
import { GitHubGetFileContentResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetFileContentResult =
  | {
      file: {
        name: string;
        path: string;
        sha: string;
        size: number;
        type: string;
        content: string | null;
        htmlUrl: string;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubGetIssueArgs

Args for `GitHubGetIssueTool`: the repository `owner`, `repo` and `issueNumber`.

```ts
import { GitHubGetIssueArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetIssueArgs = z.infer<typeof inputSchema>;
```

### GitHubGetIssueResult

Result for `GitHubGetIssueTool`: an `issue` object with title, body, state, labels,
assignees and timestamps, or an `error`.

```ts
import { GitHubGetIssueResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetIssueResult =
  | {
      issue: {
        id: number;
        number: number;
        title: string;
        body: string | null;
        state: string;
        user: string;
        labels: string[];
        assignees: string[];
        milestone: string | null;
        createdAt: string;
        updatedAt: string;
        closedAt: string | null;
        htmlUrl: string;
        comments: number;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubGetPullRequestArgs

Args for `GitHubGetPullRequestTool`: the repository `owner`, `repo` and `pullNumber`.

```ts
import { GitHubGetPullRequestArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetPullRequestArgs = z.infer<typeof inputSchema>;
```

### GitHubGetPullRequestResult

Result for `GitHubGetPullRequestTool`: a `pullRequest` object with branches, merge state,
diff stats and timestamps, or an `error`.

```ts
import { GitHubGetPullRequestResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetPullRequestResult =
  | {
      pullRequest: {
        id: number;
        number: number;
        title: string;
        body: string | null;
        state: string;
        user: string;
        head: string;
        headSha: string;
        base: string;
        merged: boolean;
        mergeable: boolean | null;
        draft: boolean;
        additions: number;
        deletions: number;
        changedFiles: number;
        createdAt: string;
        updatedAt: string;
        mergedAt: string | null;
        htmlUrl: string;
        comments: number;
        reviewComments: number;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubGetRepoArgs

Args for `GitHubGetRepoTool`: the repository `owner` and `repo` name.

```ts
import { GitHubGetRepoArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetRepoArgs = z.infer<typeof inputSchema>;
```

### GitHubGetRepoResult

Result for `GitHubGetRepoTool`: a `repo` object with id, full name, visibility,
description, language, default branch, stars, forks, topics and license, or an `error`.

```ts
import { GitHubGetRepoResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetRepoResult = {
  repo?: {
    id: number;
    fullName: string;
    name: string;
    owner: string;
    ownerAvatar: string;
    private: boolean;
    htmlUrl: string;
    description: string | null;
    language: string | null;
    defaultBranch: string;
    stars: number;
    forks: number;
    openIssues: number;
    createdAt: string;
    updatedAt: string;
    topics: string[];
    license: string | null;
  };
  error?: string;
  message?: string;
};
```

### GitHubGetWorkflowRunArgs

Args for `GitHubGetWorkflowRunTool`: the repository `owner`, `repo` and `runId`.

```ts
import { GitHubGetWorkflowRunArgs } from '@loopstack/github-module';
```

```ts
export type GitHubGetWorkflowRunArgs = z.infer<typeof inputSchema>;
```

### GitHubGetWorkflowRunResult

Result for `GitHubGetWorkflowRunTool`: a `run` object with status, conclusion, branch
and run metadata, or an `error`.

```ts
import { GitHubGetWorkflowRunResult } from '@loopstack/github-module';
```

```ts
export type GitHubGetWorkflowRunResult =
  | {
      run: {
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        headBranch: string;
        headSha: string;
        event: string;
        workflowId: number;
        runNumber: number;
        runAttempt: number;
        createdAt: string;
        updatedAt: string;
        runStartedAt: string;
        htmlUrl: string;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubListBranchesArgs

Args for `GitHubListBranchesTool`: the repository `owner`, `repo` and `perPage` page size.

```ts
import { GitHubListBranchesArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListBranchesArgs = z.input<typeof inputSchema>;
```

### GitHubListBranchesResult

Result for `GitHubListBranchesTool`: a `branches` array with name, commit SHA and
protection flag, or an `error`.

```ts
import { GitHubListBranchesResult } from '@loopstack/github-module';
```

```ts
export type GitHubListBranchesResult = {
  branches?: Array<{
    name: string;
    commitSha: string;
    protected: boolean;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubListDirectoryArgs

Args for `GitHubListDirectoryTool`: the repository `owner`, `repo`, directory `path`
(defaults to the repo root) and optional `ref`.

```ts
import { GitHubListDirectoryArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListDirectoryArgs = z.input<typeof inputSchema>;
```

### GitHubListDirectoryResult

Result for `GitHubListDirectoryTool`: an `entries` array of files and subdirectories, or an `error`.

```ts
import { GitHubListDirectoryResult } from '@loopstack/github-module';
```

```ts
export type GitHubListDirectoryResult = {
  entries?: Array<{
    name: string;
    path: string;
    sha: string;
    size: number;
    type: string;
    htmlUrl: string;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubListIssuesArgs

Args for `GitHubListIssuesTool`: the repository `owner`, `repo`, issue `state`,
optional `labels`/`assignee` filters and `perPage`/`page` paging.

```ts
import { GitHubListIssuesArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListIssuesArgs = z.input<typeof inputSchema>;
```

### GitHubListIssuesResult

Result for `GitHubListIssuesTool`: an `issues` array (each flagged with
`isPullRequest` since the GitHub API mixes in pull requests), or an `error`.

```ts
import { GitHubListIssuesResult } from '@loopstack/github-module';
```

```ts
export type GitHubListIssuesResult = {
  issues?: Array<{
    id: number;
    number: number;
    title: string;
    state: string;
    user: string;
    labels: string[];
    assignees: string[];
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
    isPullRequest: boolean;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubListPrReviewsArgs

Args for `GitHubListPrReviewsTool`: the repository `owner`, `repo` and `pullNumber`.

```ts
import { GitHubListPrReviewsArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListPrReviewsArgs = z.infer<typeof inputSchema>;
```

### GitHubListPrReviewsResult

Result for `GitHubListPrReviewsTool`: a `reviews` array with reviewer, body, state
and submission time, or an `error`.

```ts
import { GitHubListPrReviewsResult } from '@loopstack/github-module';
```

```ts
export type GitHubListPrReviewsResult =
  | {
      reviews: Array<{
        id: number;
        user: string;
        body: string;
        state: string;
        submittedAt: string;
        htmlUrl: string;
      }>;
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubListPullRequestsArgs

Args for `GitHubListPullRequestsTool`: the repository `owner`, `repo`, PR `state`,
optional `base` branch filter and `perPage`/`page` paging.

```ts
import { GitHubListPullRequestsArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListPullRequestsArgs = z.input<typeof inputSchema>;
```

### GitHubListPullRequestsResult

Result for `GitHubListPullRequestsTool`: a `pullRequests` array of PR summaries, or an `error`.

```ts
import { GitHubListPullRequestsResult } from '@loopstack/github-module';
```

```ts
export type GitHubListPullRequestsResult = {
  pullRequests?: Array<{
    id: number;
    number: number;
    title: string;
    state: string;
    user: string;
    head: string;
    headSha: string;
    base: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
    draft: boolean;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubListReposArgs

Args for `GitHubListReposTool`: `visibility`, `sort`, `perPage` and `page` paging controls.

```ts
import { GitHubListReposArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListReposArgs = z.input<typeof inputSchema>;
```

### GitHubListReposResult

Result for `GitHubListReposTool`: a `repos` array of repository summaries, or an `error`.

```ts
import { GitHubListReposResult } from '@loopstack/github-module';
```

```ts
export type GitHubListReposResult = {
  repos?: Array<{
    id: number;
    fullName: string;
    name: string;
    owner: string;
    private: boolean;
    htmlUrl: string;
    description: string | null;
    language: string | null;
    defaultBranch: string;
    updatedAt: string;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubListUserOrgsArgs

Args for `GitHubListUserOrgsTool`: the `perPage` page size.

```ts
import { GitHubListUserOrgsArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListUserOrgsArgs = z.input<typeof inputSchema>;
```

### GitHubListUserOrgsResult

Result for `GitHubListUserOrgsTool`: an `orgs` array with login, description and avatar, or an `error`.

```ts
import { GitHubListUserOrgsResult } from '@loopstack/github-module';
```

```ts
export type GitHubListUserOrgsResult = {
  orgs?: Array<{
    id: number;
    login: string;
    description: string | null;
    avatarUrl: string;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubListWorkflowRunsArgs

Args for `GitHubListWorkflowRunsTool`: the repository `owner`, `repo`, optional `branch`
and `status` filters and `perPage`/`page` paging.

```ts
import { GitHubListWorkflowRunsArgs } from '@loopstack/github-module';
```

```ts
export type GitHubListWorkflowRunsArgs = z.input<typeof inputSchema>;
```

### GitHubListWorkflowRunsResult

Result for `GitHubListWorkflowRunsTool`: `totalCount` and a `runs` array of workflow-run
summaries with status and conclusion, or an `error`.

```ts
import { GitHubListWorkflowRunsResult } from '@loopstack/github-module';
```

```ts
export type GitHubListWorkflowRunsResult = {
  totalCount?: number;
  runs?: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    headBranch: string;
    headSha: string;
    event: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubMergePullRequestArgs

Args for `GitHubMergePullRequestTool`: the repository `owner`, `repo`, `pullNumber`,
`mergeMethod` and optional `commitTitle`/`commitMessage`.

```ts
import { GitHubMergePullRequestArgs } from '@loopstack/github-module';
```

```ts
export type GitHubMergePullRequestArgs = z.input<typeof inputSchema>;
```

### GitHubMergePullRequestResult

Result for `GitHubMergePullRequestTool`: a `merge` object with the merge commit `sha`
and `merged` flag, or an `error`.

```ts
import { GitHubMergePullRequestResult } from '@loopstack/github-module';
```

```ts
export type GitHubMergePullRequestResult =
  | {
      merge: {
        sha: string;
        merged: boolean;
        message: string;
      };
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubSearchCodeArgs

Args for `GitHubSearchCodeTool`: the GitHub code-search `query` and `perPage`/`page` paging.

```ts
import { GitHubSearchCodeArgs } from '@loopstack/github-module';
```

```ts
export type GitHubSearchCodeArgs = z.input<typeof inputSchema>;
```

### GitHubSearchCodeResult

Result for `GitHubSearchCodeTool`: `totalCount` and a `results` array of matching files
with their repository, or an `error`.

```ts
import { GitHubSearchCodeResult } from '@loopstack/github-module';
```

```ts
export type GitHubSearchCodeResult = {
  totalCount?: number;
  results?: Array<{
    name: string;
    path: string;
    sha: string;
    htmlUrl: string;
    repository: string;
  }>;
  error?: string;
  message?: string;
};
```

### GitHubSearchIssuesArgs

Args for `GitHubSearchIssuesTool`: the GitHub search `query`, optional `sort` and
`perPage`/`page` paging.

```ts
import { GitHubSearchIssuesArgs } from '@loopstack/github-module';
```

```ts
export type GitHubSearchIssuesArgs = z.input<typeof inputSchema>;
```

### GitHubSearchIssuesResult

Result for `GitHubSearchIssuesTool`: `totalCount` and a `results` array of matching
issues and pull requests (each flagged with `isPullRequest`), or an `error`.

```ts
import { GitHubSearchIssuesResult } from '@loopstack/github-module';
```

```ts
export type GitHubSearchIssuesResult =
  | {
      totalCount: number;
      results: Array<{
        id: number;
        number: number;
        title: string;
        state: string;
        user: string;
        htmlUrl: string;
        createdAt: string;
        updatedAt: string;
        isPullRequest: boolean;
      }>;
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubSearchReposArgs

Args for `GitHubSearchReposTool`: the GitHub search `query`, optional `sort` and
`perPage`/`page` paging.

```ts
import { GitHubSearchReposArgs } from '@loopstack/github-module';
```

```ts
export type GitHubSearchReposArgs = z.input<typeof inputSchema>;
```

### GitHubSearchReposResult

Result for `GitHubSearchReposTool`: `totalCount` and a `results` array of matching
repositories, or an `error`.

```ts
import { GitHubSearchReposResult } from '@loopstack/github-module';
```

```ts
export type GitHubSearchReposResult =
  | {
      totalCount: number;
      results: Array<{
        id: number;
        fullName: string;
        description: string | null;
        htmlUrl: string;
        language: string | null;
        stars: number;
        forks: number;
        updatedAt: string;
      }>;
    }
  | {
      error: string;
      message: string;
    };
```

### GitHubTriggerWorkflowArgs

Args for `GitHubTriggerWorkflowTool`: the repository `owner`, `repo`, `workflowId`,
`ref` to run against and optional `inputs` for the dispatch event.

```ts
import { GitHubTriggerWorkflowArgs } from '@loopstack/github-module';
```

```ts
export type GitHubTriggerWorkflowArgs = z.infer<typeof inputSchema>;
```

### GitHubTriggerWorkflowResult

Result for `GitHubTriggerWorkflowTool`: a `triggered` flag with a message, or an `error`.

```ts
import { GitHubTriggerWorkflowResult } from '@loopstack/github-module';
```

```ts
export type GitHubTriggerWorkflowResult =
  | {
      triggered: boolean;
      message: string;
    }
  | {
      error: string;
      message: string;
    };
```
