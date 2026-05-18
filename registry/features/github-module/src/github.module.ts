import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GitHubOAuthProvider } from './github-oauth.provider.js';
import { GitHubGetWorkflowRunTool } from './tools/actions/github-get-workflow-run.tool.js';
import { GitHubListWorkflowRunsTool } from './tools/actions/github-list-workflow-runs.tool.js';
import { GitHubTriggerWorkflowTool } from './tools/actions/github-trigger-workflow.tool.js';
import { GitHubCreateOrUpdateFileTool } from './tools/content/github-create-or-update-file.tool.js';
import { GitHubGetCommitTool } from './tools/content/github-get-commit.tool.js';
import { GitHubGetFileContentTool } from './tools/content/github-get-file-content.tool.js';
import { GitHubListDirectoryTool } from './tools/content/github-list-directory.tool.js';
import { GitHubCreateIssueCommentTool } from './tools/issues/github-create-issue-comment.tool.js';
import { GitHubCreateIssueTool } from './tools/issues/github-create-issue.tool.js';
import { GitHubGetIssueTool } from './tools/issues/github-get-issue.tool.js';
import { GitHubListIssuesTool } from './tools/issues/github-list-issues.tool.js';
import { GitHubCreatePullRequestTool } from './tools/pull-requests/github-create-pull-request.tool.js';
import { GitHubGetPullRequestTool } from './tools/pull-requests/github-get-pull-request.tool.js';
import { GitHubListPrReviewsTool } from './tools/pull-requests/github-list-pr-reviews.tool.js';
import { GitHubListPullRequestsTool } from './tools/pull-requests/github-list-pull-requests.tool.js';
import { GitHubMergePullRequestTool } from './tools/pull-requests/github-merge-pull-request.tool.js';
import { GitHubCreateRepoTool } from './tools/repos/github-create-repo.tool.js';
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
];

@Module({
  imports: [OAuthModule],
  providers: [GitHubOAuthProvider, ...tools],
  exports: [GitHubOAuthProvider, ...tools],
})
export class GitHubModule {}
