import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth';
import { GitHubOAuthProvider } from './github-oauth.provider.js';
import { GITHUB_TOKEN_PROVIDER, OAuthGitHubTokenProvider } from './token/index.js';
import { GitHubGetWorkflowRunTool } from './tools/actions/github-get-workflow-run.tool.js';
import { GitHubListWorkflowRunsTool } from './tools/actions/github-list-workflow-runs.tool.js';
import { GitHubTriggerWorkflowTool } from './tools/actions/github-trigger-workflow.tool.js';
import { GitHubCreateOrUpdateFileTool } from './tools/content/github-create-or-update-file.tool.js';
import { GitHubGetCommitTool } from './tools/content/github-get-commit.tool.js';
import { GitHubGetFileContentTool } from './tools/content/github-get-file-content.tool.js';
import { GitHubListDirectoryTool } from './tools/content/github-list-directory.tool.js';
import { GitHubAddIssueAssigneesTool } from './tools/issues/github-add-issue-assignees.tool.js';
import { GitHubAddIssueDependencyTool } from './tools/issues/github-add-issue-dependency.tool.js';
import { GitHubAddIssueLabelsTool } from './tools/issues/github-add-issue-labels.tool.js';
import { GitHubCloseIssueTool } from './tools/issues/github-close-issue.tool.js';
import { GitHubCreateIssueCommentTool } from './tools/issues/github-create-issue-comment.tool.js';
import { GitHubCreateIssueTool } from './tools/issues/github-create-issue.tool.js';
import { GitHubEnsureLabelTool } from './tools/issues/github-ensure-label.tool.js';
import { GitHubGetIssueTool } from './tools/issues/github-get-issue.tool.js';
import { GitHubListIssueCommentsTool } from './tools/issues/github-list-issue-comments.tool.js';
import { GitHubListIssuesTool } from './tools/issues/github-list-issues.tool.js';
import { GitHubRemoveIssueAssigneesTool } from './tools/issues/github-remove-issue-assignees.tool.js';
import { GitHubRemoveIssueLabelTool } from './tools/issues/github-remove-issue-label.tool.js';
import { GitHubSetIssueFieldsTool } from './tools/issues/github-set-issue-fields.tool.js';
import { GitHubUpdateIssueTool } from './tools/issues/github-update-issue.tool.js';
import { GitHubCreatePullRequestTool } from './tools/pull-requests/github-create-pull-request.tool.js';
import { GitHubGetPullRequestTool } from './tools/pull-requests/github-get-pull-request.tool.js';
import { GitHubListPrReviewsTool } from './tools/pull-requests/github-list-pr-reviews.tool.js';
import { GitHubListPullRequestsTool } from './tools/pull-requests/github-list-pull-requests.tool.js';
import { GitHubMergePullRequestTool } from './tools/pull-requests/github-merge-pull-request.tool.js';
import { GitHubCreateRepoTool } from './tools/repos/github-create-repo.tool.js';
import { GitHubDeleteBranchTool } from './tools/repos/github-delete-branch.tool.js';
import { GitHubGetRepoTool } from './tools/repos/github-get-repo.tool.js';
import { GitHubListBranchesTool } from './tools/repos/github-list-branches.tool.js';
import { GitHubListReposTool } from './tools/repos/github-list-repos.tool.js';
import { GitHubSearchCodeTool } from './tools/search/github-search-code.tool.js';
import { GitHubSearchIssuesTool } from './tools/search/github-search-issues.tool.js';
import { GitHubSearchReposTool } from './tools/search/github-search-repos.tool.js';
import { GitHubGetAuthenticatedUserTool } from './tools/users/github-get-authenticated-user.tool.js';
import { GitHubListUserOrgsTool } from './tools/users/github-list-user-orgs.tool.js';

const tools = [
  GitHubListReposTool,
  GitHubGetRepoTool,
  GitHubCreateRepoTool,
  GitHubListBranchesTool,
  GitHubListIssuesTool,
  GitHubGetIssueTool,
  GitHubCreateIssueTool,
  GitHubCreateIssueCommentTool,
  GitHubListPullRequestsTool,
  GitHubGetPullRequestTool,
  GitHubCreatePullRequestTool,
  GitHubMergePullRequestTool,
  GitHubListPrReviewsTool,
  GitHubGetFileContentTool,
  GitHubCreateOrUpdateFileTool,
  GitHubListDirectoryTool,
  GitHubGetCommitTool,
  GitHubListWorkflowRunsTool,
  GitHubTriggerWorkflowTool,
  GitHubGetWorkflowRunTool,
  GitHubSearchCodeTool,
  GitHubSearchReposTool,
  GitHubSearchIssuesTool,
  GitHubGetAuthenticatedUserTool,
  GitHubListUserOrgsTool,
  GitHubAddIssueLabelsTool,
  GitHubRemoveIssueLabelTool,
  GitHubEnsureLabelTool,
  GitHubUpdateIssueTool,
  GitHubCloseIssueTool,
  GitHubAddIssueAssigneesTool,
  GitHubRemoveIssueAssigneesTool,
  GitHubListIssueCommentsTool,
  GitHubSetIssueFieldsTool,
  GitHubAddIssueDependencyTool,
  GitHubDeleteBranchTool,
];

/**
 * NestJS module that provides the GitHub OAuth provider (`GitHubOAuthProvider`) and the GitHub API tools
 * for repositories, issues, pull requests, file content/git ops, actions/workflow runs, search, and users/orgs.
 *
 * Registration:
 * - `GitHubModule` — bare import; it internally imports `OAuthModule`, registers `GitHubOAuthProvider` and
 *   all tools, and authenticates every tool with the signed-in user's OAuth token.
 * - `GitHubModule.forRoot({ tokenProvider })` — the same tools, authenticated with a token the app supplies
 *   through its own {@link GitHubTokenProvider}. What a headless app needs, which has no signed-in user and
 *   runs on a personal access token or an app installation token of its own.
 *
 * Requires, for the OAuth default: a configured GitHub OAuth app via the environment variables
 * `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_OAUTH_REDIRECT_URI`. A run whose token provider
 * has no token gets `{ error: 'unauthorized' }` from every tool.
 *
 * @public
 */
@Module({
  imports: [OAuthModule],
  providers: [GitHubOAuthProvider, { provide: GITHUB_TOKEN_PROVIDER, useClass: OAuthGitHubTokenProvider }, ...tools],
  exports: [GitHubOAuthProvider, GITHUB_TOKEN_PROVIDER, ...tools],
})
export class GitHubModule {
  /**
   * The tools, authenticated with the app's own token provider instead of the signed-in user's OAuth token.
   * `tokenProvider` is a provider for {@link GITHUB_TOKEN_PROVIDER}, so it can inject whatever the app keeps
   * its token in.
   */
  static forRoot(options: { tokenProvider: Provider }): DynamicModule {
    return {
      module: GitHubModule,
      providers: [options.tokenProvider],
      exports: [GITHUB_TOKEN_PROVIDER, ...tools],
    };
  }
}
