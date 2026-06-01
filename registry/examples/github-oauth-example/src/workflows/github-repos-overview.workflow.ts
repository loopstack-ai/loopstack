import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  Final,
  Guard,
  Initial,
  LinkDocument,
  MarkdownDocument,
  TEMPLATE_RENDERER,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn, WorkflowContext } from '@loopstack/common';
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

@Workflow({
  title: 'GitHub Repos Overview',
  name: 'github_repos_overview',
  uiConfig: __dirname + '/github-repos-overview.ui.yaml',
  schema: z
    .object({
      owner: z.string().default('octocat'),
      repo: z.string().default('Hello-World'),
    })
    .strict(),
})
export class GitHubReposOverviewWorkflow extends BaseWorkflow<
  { owner: string; repo: string },
  GitHubReposOverviewState
> {
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
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  // --- Step 1: Fetch authenticated user ---

  @Initial({ to: 'user_fetched' })
  async fetchUser(
    ctx: WorkflowContext,
    args: { owner: string; repo: string },
    state: GitHubReposOverviewState,
  ): Promise<GitHubReposOverviewState> {
    const result = await this.gitHubGetAuthenticatedUser.call();
    return {
      ...state,
      owner: args.owner,
      repo: args.repo,
      requiresAuthentication: result.data!.error === 'unauthorized',
      user: result.data!.user,
    };
  }

  // If unauthorized -> launch OAuth
  @Transition({ from: 'user_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
    const result = await this.orchestrator.queue(
      { provider: 'github', scopes: ['repo', 'read:org', 'workflow'] },
      { workflowName: 'OAuthWorkflow', callback: { transition: 'authCompleted' } },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'GitHub authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  needsAuth(state: GitHubReposOverviewState): boolean {
    return !!state.requiresAuthentication;
  }

  // Auth completed -> retry from start
  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
    schema: CallbackSchema,
  })
  async authCompleted(
    ctx: WorkflowContext,
    state: GitHubReposOverviewState,
    payload: { workflowId: string },
  ): Promise<GitHubReposOverviewState> {
    await this.documentStore.save(
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
    return state;
  }

  // --- Step 2: Fetch user orgs ---

  @Transition({ from: 'user_fetched', to: 'orgs_fetched' })
  async fetchOrgs(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
    const result = await this.gitHubListUserOrgs.call({ perPage: 10 });
    return { ...state, orgs: result.data!.orgs };
  }

  // --- Step 3: Fetch repo details and branches ---

  @Transition({ from: 'orgs_fetched', to: 'repo_fetched' })
  async fetchRepoDetails(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
    const repoResult = await this.gitHubGetRepo.call({
      owner: state.owner,
      repo: state.repo,
    });

    const branchesResult = await this.gitHubListBranches.call({
      owner: state.owner,
      repo: state.repo,
    });
    return { ...state, repoDetails: repoResult.data!.repo, branches: branchesResult.data!.branches };
  }

  // --- Step 4: Fetch issues and PRs ---

  @Transition({ from: 'repo_fetched', to: 'issues_prs_fetched' })
  async fetchIssuesPrs(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
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
    return { ...state, issues: issuesResult.data!.issues, pullRequests: prsResult.data!.pullRequests };
  }

  // --- Step 5: Fetch directory listing and workflow runs ---

  @Transition({ from: 'issues_prs_fetched', to: 'content_actions_fetched' })
  async fetchContentActions(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
    const dirResult = await this.gitHubListDirectory.call({
      owner: state.owner,
      repo: state.repo,
    });

    const runsResult = await this.gitHubListWorkflowRuns.call({
      owner: state.owner,
      repo: state.repo,
      perPage: 5,
    });
    return { ...state, directoryEntries: dirResult.data!.entries, workflowRuns: runsResult.data!.runs };
  }

  // --- Step 6: Search code in the repo ---

  @Transition({ from: 'content_actions_fetched', to: 'search_done' })
  async fetchSearch(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<GitHubReposOverviewState> {
    const result = await this.gitHubSearchCode.call({
      query: `repo:${state.owner}/${state.repo}`,
      perPage: 5,
    });
    return { ...state, searchResults: result.data!.results };
  }

  // --- Display all results ---

  @Final({ from: 'search_done' })
  async displayResults(ctx: WorkflowContext, state: GitHubReposOverviewState): Promise<unknown> {
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
    return {};
  }
}
