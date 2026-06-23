import { z } from 'zod';
import { BaseWorkflow, Guard, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
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

interface GitHubReposOverviewState {
  owner: string;
  repo: string;
  requiresAuthentication?: boolean;
  user?: { login: string; name: string | null; htmlUrl: string; publicRepos: number };
  orgs?: Array<{ login: string; description: string | null }>;
  repoDetails?: {
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
}

const GitHubReposOverviewArgsSchema = z
  .object({
    owner: z.string().default('octocat'),
    repo: z.string().default('Hello-World'),
  })
  .strict();

type GitHubReposOverviewArgs = z.infer<typeof GitHubReposOverviewArgsSchema>;

@Workflow({
  title: 'GitHub Repository Overview',
  description:
    'Comprehensive GitHub example that exercises every GitHub tool.\nFetches user info, repository details, issues, pull requests, branches,\ndirectory contents, workflow runs, and search results for a given repository.\nIf not authenticated, launches the OAuth sub-workflow and retries.',
  name: 'github_repos_overview',
  schema: GitHubReposOverviewArgsSchema,
})
export class GitHubReposOverviewWorkflow extends BaseWorkflow<GitHubReposOverviewArgs> {
  constructor(
    private readonly gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool,
    private readonly gitHubListUserOrgs: GitHubListUserOrgsTool,
    private readonly gitHubGetRepo: GitHubGetRepoTool,
    private readonly gitHubListBranches: GitHubListBranchesTool,
    private readonly gitHubListIssues: GitHubListIssuesTool,
    private readonly gitHubListPullRequests: GitHubListPullRequestsTool,
    private readonly gitHubListDirectory: GitHubListDirectoryTool,
    private readonly gitHubListWorkflowRuns: GitHubListWorkflowRunsTool,
    private readonly gitHubSearchCode: GitHubSearchCodeTool,
    private readonly oAuthWorkflow: OAuthWorkflow,
  ) {
    super();
  }

  // --- Step 1: Fetch authenticated user ---

  @Transition({ to: 'user_fetched' })
  async fetchUser(state: GitHubReposOverviewState, ctx: RunContext<GitHubReposOverviewArgs>) {
    const result = await this.gitHubGetAuthenticatedUser.call();
    this.assignState({
      owner: ctx.args.owner,
      repo: ctx.args.repo,
      requiresAuthentication: result.data.error === 'unauthorized',
      user: result.data.user,
    });
  }

  // If unauthorized -> launch OAuth
  @Transition({ from: 'user_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired(_state: GitHubReposOverviewState) {
    await this.oAuthWorkflow.run(
      { provider: 'github', scopes: ['repo', 'read:org', 'workflow'] },
      { callback: { transition: 'authCompleted' }, show: 'inline', label: 'GitHub authentication required' },
    );
  }

  needsAuth(state: GitHubReposOverviewState): boolean {
    return !!state.requiresAuthentication;
  }

  // Auth completed -> retry from start
  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
  })
  authCompleted(_state: GitHubReposOverviewState, _input: TransitionInput) {}

  // --- Step 2: Fetch user orgs ---

  @Transition({ from: 'user_fetched', to: 'orgs_fetched' })
  async fetchOrgs(_state: GitHubReposOverviewState) {
    const result = await this.gitHubListUserOrgs.call({ perPage: 10 });
    this.assignState({ orgs: result.data.orgs });
  }

  // --- Step 3: Fetch repo details and branches ---

  @Transition({ from: 'orgs_fetched', to: 'repo_fetched' })
  async fetchRepoDetails(state: GitHubReposOverviewState) {
    const repoResult = await this.gitHubGetRepo.call({
      owner: state.owner,
      repo: state.repo,
    });

    const branchesResult = await this.gitHubListBranches.call({
      owner: state.owner,
      repo: state.repo,
    });
    this.assignState({ repoDetails: repoResult.data.repo, branches: branchesResult.data.branches });
  }

  // --- Step 4: Fetch issues and PRs ---

  @Transition({ from: 'repo_fetched', to: 'issues_prs_fetched' })
  async fetchIssuesPrs(state: GitHubReposOverviewState) {
    const issuesResult = await this.gitHubListIssues.call({
      owner: state.owner,
      repo: state.repo,
      state: 'open',
      perPage: 10,
    });

    const prsResult = await this.gitHubListPullRequests.call({
      owner: state.owner,
      repo: state.repo,
      state: 'open',
      perPage: 10,
    });
    this.assignState({ issues: issuesResult.data.issues, pullRequests: prsResult.data.pullRequests });
  }

  // --- Step 5: Fetch directory listing and workflow runs ---

  @Transition({ from: 'issues_prs_fetched', to: 'content_actions_fetched' })
  async fetchContentActions(state: GitHubReposOverviewState) {
    const dirResult = await this.gitHubListDirectory.call({
      owner: state.owner,
      repo: state.repo,
    });

    const runsResult = await this.gitHubListWorkflowRuns.call({
      owner: state.owner,
      repo: state.repo,
      perPage: 5,
    });
    this.assignState({ directoryEntries: dirResult.data.entries, workflowRuns: runsResult.data.runs });
  }

  // --- Step 6: Search code in the repo ---

  @Transition({ from: 'content_actions_fetched', to: 'search_done' })
  async fetchSearch(state: GitHubReposOverviewState) {
    const result = await this.gitHubSearchCode.call({
      query: `repo:${state.owner}/${state.repo}`,
      perPage: 5,
    });
    this.assignState({ searchResults: result.data.results });
  }

  // --- Display all results ---

  @Transition({ from: 'search_done', to: 'end' })
  async displayResults(state: GitHubReposOverviewState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/repoOverview.md', {
        user: state.user,
        orgs: state.orgs,
        repo: state.repoDetails,
        branches: state.branches,
        issues: state.issues,
        pullRequests: state.pullRequests,
        directoryEntries: state.directoryEntries,
        workflowRuns: state.workflowRuns,
        searchResults: state.searchResults,
      }),
    });
  }
}
