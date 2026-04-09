import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import { LinkDocument, MarkdownDocument } from '@loopstack/core';
import {
  GitHubGetAuthenticatedUserTool,
  GitHubGetRepoTool,
  GitHubListBranchesTool,
  GitHubListDirectoryTool,
  GitHubListIssuesTool,
  GitHubListPullRequestsTool,
  GitHubListUserOrgsTool,
  GitHubListWorkflowRunsTool,
  GitHubSearchCodeTool,
} from '@loopstack/github-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';

interface GitHubUserResult {
  error?: string;
  user?: { login: string; name: string | null; htmlUrl: string; publicRepos: number };
}

interface GitHubOrgsResult {
  orgs: Array<{ login: string; description: string | null }>;
}

interface GitHubRepoResult {
  repo: {
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    defaultBranch: string;
    htmlUrl: string;
  };
}

interface GitHubBranchesResult {
  branches: Array<{ name: string; protected: boolean }>;
}

interface GitHubIssuesResult {
  issues: Array<{ number: number; title: string; state: string; user: string; htmlUrl: string }>;
}

interface GitHubPullRequestsResult {
  pullRequests: Array<{
    number: number;
    title: string;
    state: string;
    user: string;
    draft: boolean;
    htmlUrl: string;
  }>;
}

interface GitHubDirectoryResult {
  entries: Array<{ name: string; type: string; path: string }>;
}

interface GitHubWorkflowRunsResult {
  totalCount: number;
  runs: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    htmlUrl: string;
  }>;
}

interface GitHubSearchCodeResult {
  totalCount: number;
  results: Array<{ name: string; path: string; repository: string }>;
}

@Workflow({
  uiConfig: __dirname + '/github-repos-overview.ui.yaml',
  schema: z
    .object({
      owner: z.string().default('octocat'),
      repo: z.string().default('Hello-World'),
    })
    .strict(),
})
export class GitHubReposOverviewWorkflow extends BaseWorkflow {
  // GitHub tools
  @InjectTool() private gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool;
  @InjectTool() private gitHubListUserOrgs: GitHubListUserOrgsTool;
  @InjectTool() private gitHubGetRepo: GitHubGetRepoTool;
  @InjectTool() private gitHubListBranches: GitHubListBranchesTool;
  @InjectTool() private gitHubListIssues: GitHubListIssuesTool;
  @InjectTool() private gitHubListPullRequests: GitHubListPullRequestsTool;
  @InjectTool() private gitHubListDirectory: GitHubListDirectoryTool;
  @InjectTool() private gitHubListWorkflowRuns: GitHubListWorkflowRunsTool;
  @InjectTool() private gitHubSearchCode: GitHubSearchCodeTool;

  @InjectWorkflow() oAuth: OAuthWorkflow;

  requiresAuthentication?: boolean;
  user?: { login: string; name: string | null; htmlUrl: string; publicRepos: number };
  orgs?: Array<{ login: string; description: string | null }>;
  repo?: {
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    defaultBranch: string;
    htmlUrl: string;
  };
  branches?: Array<{ name: string; protected: boolean }>;
  issues?: Array<{ number: number; title: string; state: string; user: string; htmlUrl: string }>;
  pullRequests?: Array<{
    number: number;
    title: string;
    state: string;
    user: string;
    draft: boolean;
    htmlUrl: string;
  }>;
  directoryEntries?: Array<{ name: string; type: string; path: string }>;
  workflowRuns?: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    htmlUrl: string;
  }>;
  searchResults?: Array<{ name: string; path: string; repository: string }>;
  // --- Step 1: Fetch authenticated user ---

  @Initial({ to: 'user_fetched' })
  async fetchUser() {
    const result: ToolResult<GitHubUserResult> = await this.gitHubGetAuthenticatedUser.call({});
    this.requiresAuthentication = result.data!.error === 'unauthorized';
    this.user = result.data!.user;
  }

  // If unauthorized -> launch OAuth
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

  // Auth completed -> retry from start
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

  // --- Step 2: Fetch user orgs ---

  @Transition({ from: 'user_fetched', to: 'orgs_fetched' })
  async fetchOrgs() {
    const result: ToolResult<GitHubOrgsResult> = await this.gitHubListUserOrgs.call({ perPage: 10 });
    this.orgs = result.data!.orgs;
  }

  // --- Step 3: Fetch repo details and branches ---

  @Transition({ from: 'orgs_fetched', to: 'repo_fetched' })
  async fetchRepoDetails() {
    const args = this.ctx.args as { owner: string; repo: string };
    const repoResult: ToolResult<GitHubRepoResult> = await this.gitHubGetRepo.call({
      owner: args.owner,
      repo: args.repo,
    });
    this.repo = repoResult.data!.repo;

    const branchesResult: ToolResult<GitHubBranchesResult> = await this.gitHubListBranches.call({
      owner: args.owner,
      repo: args.repo,
    });
    this.branches = branchesResult.data!.branches;
  }

  // --- Step 4: Fetch issues and PRs ---

  @Transition({ from: 'repo_fetched', to: 'issues_prs_fetched' })
  async fetchIssuesPrs() {
    const args = this.ctx.args as { owner: string; repo: string };
    const issuesResult: ToolResult<GitHubIssuesResult> = await this.gitHubListIssues.call({
      owner: args.owner,
      repo: args.repo,
      state: 'open',
      perPage: 10,
    });
    this.issues = issuesResult.data!.issues;

    const prsResult: ToolResult<GitHubPullRequestsResult> = await this.gitHubListPullRequests.call({
      owner: args.owner,
      repo: args.repo,
      state: 'open',
      perPage: 10,
    });
    this.pullRequests = prsResult.data!.pullRequests;
  }

  // --- Step 5: Fetch directory listing and workflow runs ---

  @Transition({ from: 'issues_prs_fetched', to: 'content_actions_fetched' })
  async fetchContentActions() {
    const args = this.ctx.args as { owner: string; repo: string };
    const dirResult: ToolResult<GitHubDirectoryResult> = await this.gitHubListDirectory.call({
      owner: args.owner,
      repo: args.repo,
    });
    this.directoryEntries = dirResult.data!.entries;

    const runsResult: ToolResult<GitHubWorkflowRunsResult> = await this.gitHubListWorkflowRuns.call({
      owner: args.owner,
      repo: args.repo,
      perPage: 5,
    });
    this.workflowRuns = runsResult.data!.runs;
  }

  // --- Step 6: Search code in the repo ---

  @Transition({ from: 'content_actions_fetched', to: 'search_done' })
  async fetchSearch() {
    const args = this.ctx.args as { owner: string; repo: string };
    const result: ToolResult<GitHubSearchCodeResult> = await this.gitHubSearchCode.call({
      query: `repo:${args.owner}/${args.repo}`,
      perPage: 5,
    });
    this.searchResults = result.data!.results;
  }

  // --- Display all results ---

  @Final({ from: 'search_done' })
  async displayResults() {
    await this.repository.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/repoOverview.md', {
        user: this.user,
        orgs: this.orgs,
        repo: this.repo,
        branches: this.branches,
        issues: this.issues,
        pullRequests: this.pullRequests,
        directoryEntries: this.directoryEntries,
        workflowRuns: this.workflowRuns,
        searchResults: this.searchResults,
      }),
    });
  }
}
