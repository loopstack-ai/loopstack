import { z } from 'zod';
import {
  Final,
  Guard,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  InjectWorkflow,
  Input,
  ToolResult,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
  WorkflowTemplates,
} from '@loopstack/common';
import { LinkDocument, MarkdownDocument, Task } from '@loopstack/core';
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

interface TaskRunResult {
  mode: string;
  correlationId: string;
  workflowId: string;
  eventName: string;
}

interface SubWorkflowCallbackPayload {
  workflowId: string;
  status: string;
}

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
  uiConfig: __dirname + '/github-repos-overview.workflow.yaml',
  templates: {
    repoOverview: __dirname + '/templates/repoOverview.md',
  },
})
export class GitHubReposOverviewWorkflow {
  // Core tools
  @InjectTool() private task: Task;

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

  // Documents
  @InjectDocument() private linkDocument: LinkDocument;
  @InjectDocument() private markdown: MarkdownDocument;

  @InjectWorkflow() oAuth: OAuthWorkflow;
  @InjectTemplates() templates: WorkflowTemplates;

  @Input({
    schema: z
      .object({
        owner: z.string().default('octocat'),
        repo: z.string().default('Hello-World'),
      })
      .strict(),
  })
  args: {
    owner: string;
    repo: string;
  };

  private runtime: WorkflowMetadataInterface;

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
  private authWorkflowId?: string;

  // --- Step 1: Fetch authenticated user ---

  @Initial({ to: 'user_fetched' })
  async fetchUser() {
    const result: ToolResult<GitHubUserResult> = await this.gitHubGetAuthenticatedUser.run({});
    this.requiresAuthentication = result.data!.error === 'unauthorized';
    this.user = result.data!.user;
  }

  // If unauthorized -> launch OAuth
  @Transition({ from: 'user_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired() {
    const taskResult: ToolResult<TaskRunResult> = await this.task.run({
      workflow: 'oAuth',
      args: {
        provider: 'github',
        scopes: ['repo', 'read:org', 'workflow'],
      },
      callback: { transition: 'authCompleted' },
    });
    this.authWorkflowId = taskResult.data!.workflowId;

    await this.linkDocument.create({
      id: 'authStatus',
      content: {
        icon: 'LockKeyhole',
        label: 'GitHub authentication required',
        caption: 'Complete sign-in to continue',
        href: `/workflows/${this.authWorkflowId}`,
        embed: true,
        expanded: true,
      },
    });
  }

  needsAuth(): boolean {
    return !!this.requiresAuthentication;
  }

  // Auth completed -> retry from start
  @Transition({ from: 'awaiting_auth', to: 'start', wait: true })
  async authCompleted() {
    await this.linkDocument.create({
      id: 'authStatus',
      content: {
        icon: 'ShieldCheck',
        type: 'success',
        label: 'GitHub authentication completed',
        caption: 'You are now authenticated with GitHub.',
        href: `/workflows/${(this.runtime.transition!.payload as SubWorkflowCallbackPayload).workflowId}`,
      },
    });
  }

  // --- Step 2: Fetch user orgs ---

  @Transition({ from: 'user_fetched', to: 'orgs_fetched' })
  async fetchOrgs() {
    const result: ToolResult<GitHubOrgsResult> = await this.gitHubListUserOrgs.run({ perPage: 10 });
    this.orgs = result.data!.orgs;
  }

  // --- Step 3: Fetch repo details and branches ---

  @Transition({ from: 'orgs_fetched', to: 'repo_fetched' })
  async fetchRepoDetails() {
    const repoResult: ToolResult<GitHubRepoResult> = await this.gitHubGetRepo.run({
      owner: this.args.owner,
      repo: this.args.repo,
    });
    this.repo = repoResult.data!.repo;

    const branchesResult: ToolResult<GitHubBranchesResult> = await this.gitHubListBranches.run({
      owner: this.args.owner,
      repo: this.args.repo,
    });
    this.branches = branchesResult.data!.branches;
  }

  // --- Step 4: Fetch issues and PRs ---

  @Transition({ from: 'repo_fetched', to: 'issues_prs_fetched' })
  async fetchIssuesPrs() {
    const issuesResult: ToolResult<GitHubIssuesResult> = await this.gitHubListIssues.run({
      owner: this.args.owner,
      repo: this.args.repo,
      state: 'open',
      perPage: 10,
    });
    this.issues = issuesResult.data!.issues;

    const prsResult: ToolResult<GitHubPullRequestsResult> = await this.gitHubListPullRequests.run({
      owner: this.args.owner,
      repo: this.args.repo,
      state: 'open',
      perPage: 10,
    });
    this.pullRequests = prsResult.data!.pullRequests;
  }

  // --- Step 5: Fetch directory listing and workflow runs ---

  @Transition({ from: 'issues_prs_fetched', to: 'content_actions_fetched' })
  async fetchContentActions() {
    const dirResult: ToolResult<GitHubDirectoryResult> = await this.gitHubListDirectory.run({
      owner: this.args.owner,
      repo: this.args.repo,
    });
    this.directoryEntries = dirResult.data!.entries;

    const runsResult: ToolResult<GitHubWorkflowRunsResult> = await this.gitHubListWorkflowRuns.run({
      owner: this.args.owner,
      repo: this.args.repo,
      perPage: 5,
    });
    this.workflowRuns = runsResult.data!.runs;
  }

  // --- Step 6: Search code in the repo ---

  @Transition({ from: 'content_actions_fetched', to: 'search_done' })
  async fetchSearch() {
    const result: ToolResult<GitHubSearchCodeResult> = await this.gitHubSearchCode.run({
      query: this.searchQuery(),
      perPage: 5,
    });
    this.searchResults = result.data!.results;
  }

  // --- Display all results ---

  @Final({ from: 'search_done' })
  async displayResults() {
    await this.markdown.create({
      content: {
        markdown: this.templates.render('repoOverview', {
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
      },
    });
  }

  private searchQuery(): string {
    return `repo:${this.args.owner}/${this.args.repo}`;
  }
}
