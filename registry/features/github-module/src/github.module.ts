import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GitHubOAuthProvider } from './github-oauth.provider';
import { GitHubGetWorkflowRunTool } from './tools/actions/github-get-workflow-run.tool';
import { GitHubListWorkflowRunsTool } from './tools/actions/github-list-workflow-runs.tool';
import { GitHubTriggerWorkflowTool } from './tools/actions/github-trigger-workflow.tool';
import { GitHubCreateOrUpdateFileTool } from './tools/content/github-create-or-update-file.tool';
import { GitHubGetCommitTool } from './tools/content/github-get-commit.tool';
import { GitHubGetFileContentTool } from './tools/content/github-get-file-content.tool';
import { GitHubListDirectoryTool } from './tools/content/github-list-directory.tool';
import { GitHubCreateIssueCommentTool } from './tools/issues/github-create-issue-comment.tool';
import { GitHubCreateIssueTool } from './tools/issues/github-create-issue.tool';
import { GitHubGetIssueTool } from './tools/issues/github-get-issue.tool';
import { GitHubListIssuesTool } from './tools/issues/github-list-issues.tool';
import { GitHubCreatePullRequestTool } from './tools/pull-requests/github-create-pull-request.tool';
import { GitHubGetPullRequestTool } from './tools/pull-requests/github-get-pull-request.tool';
import { GitHubListPrReviewsTool } from './tools/pull-requests/github-list-pr-reviews.tool';
import { GitHubListPullRequestsTool } from './tools/pull-requests/github-list-pull-requests.tool';
import { GitHubMergePullRequestTool } from './tools/pull-requests/github-merge-pull-request.tool';
import { GitHubCreateRepoTool } from './tools/repos/github-create-repo.tool';
import { GitHubGetRepoTool } from './tools/repos/github-get-repo.tool';
import { GitHubListBranchesTool } from './tools/repos/github-list-branches.tool';
import { GitHubListReposTool } from './tools/repos/github-list-repos.tool';
import { GitHubSearchCodeTool } from './tools/search/github-search-code.tool';
import { GitHubSearchIssuesTool } from './tools/search/github-search-issues.tool';
import { GitHubSearchReposTool } from './tools/search/github-search-repos.tool';
import { GitHubGetAuthenticatedUserTool } from './tools/users/github-get-authenticated-user.tool';
import { GitHubListUserOrgsTool } from './tools/users/github-list-user-orgs.tool';

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
