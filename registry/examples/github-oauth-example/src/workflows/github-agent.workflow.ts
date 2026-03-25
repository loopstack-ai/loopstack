import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeMessageDocument,
  DelegateToolCalls,
  UpdateToolResult,
} from '@loopstack/claude-module';
import {
  InjectDocument,
  InjectTool,
  InjectWorkflow,
  Runtime,
  State,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { CreateDocument, LinkDocument, Task } from '@loopstack/core';
import {
  GitHubCreateIssueCommentTool,
  GitHubCreateIssueTool,
  GitHubCreateOrUpdateFileTool,
  GitHubCreatePullRequestTool,
  GitHubCreateRepoTool,
  GitHubGetAuthenticatedUserTool,
  GitHubGetCommitTool,
  GitHubGetFileContentTool,
  GitHubGetIssueTool,
  GitHubGetPullRequestTool,
  GitHubGetRepoTool,
  GitHubGetWorkflowRunTool,
  GitHubListBranchesTool,
  GitHubListDirectoryTool,
  GitHubListIssuesTool,
  GitHubListPrReviewsTool,
  GitHubListPullRequestsTool,
  GitHubListReposTool,
  GitHubListUserOrgsTool,
  GitHubListWorkflowRunsTool,
  GitHubMergePullRequestTool,
  GitHubSearchCodeTool,
  GitHubSearchIssuesTool,
  GitHubSearchReposTool,
  GitHubTriggerWorkflowTool,
} from '@loopstack/github-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { AuthenticateGitHubTask } from '../tools/authenticate-github-task.tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/github-agent.workflow.yaml',
})
export class GitHubAgentWorkflow implements WorkflowInterface {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() task: Task;
  @InjectTool() authenticateGitHub: AuthenticateGitHubTask;

  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
  @InjectDocument() linkDocument: LinkDocument;

  // GitHub Repos tools
  @InjectTool() gitHubListRepos: GitHubListReposTool;
  @InjectTool() gitHubGetRepo: GitHubGetRepoTool;
  @InjectTool() gitHubCreateRepo: GitHubCreateRepoTool;
  @InjectTool() gitHubListBranches: GitHubListBranchesTool;

  // GitHub Issues tools
  @InjectTool() gitHubListIssues: GitHubListIssuesTool;
  @InjectTool() gitHubGetIssue: GitHubGetIssueTool;
  @InjectTool() gitHubCreateIssue: GitHubCreateIssueTool;
  @InjectTool() gitHubCreateIssueComment: GitHubCreateIssueCommentTool;

  // GitHub Pull Requests tools
  @InjectTool() gitHubListPullRequests: GitHubListPullRequestsTool;
  @InjectTool() gitHubGetPullRequest: GitHubGetPullRequestTool;
  @InjectTool() gitHubCreatePullRequest: GitHubCreatePullRequestTool;
  @InjectTool() gitHubMergePullRequest: GitHubMergePullRequestTool;
  @InjectTool() gitHubListPrReviews: GitHubListPrReviewsTool;

  // GitHub Content / Git Ops tools
  @InjectTool() gitHubGetFileContent: GitHubGetFileContentTool;
  @InjectTool() gitHubCreateOrUpdateFile: GitHubCreateOrUpdateFileTool;
  @InjectTool() gitHubListDirectory: GitHubListDirectoryTool;
  @InjectTool() gitHubGetCommit: GitHubGetCommitTool;

  // GitHub Actions tools
  @InjectTool() gitHubListWorkflowRuns: GitHubListWorkflowRunsTool;
  @InjectTool() gitHubTriggerWorkflow: GitHubTriggerWorkflowTool;
  @InjectTool() gitHubGetWorkflowRun: GitHubGetWorkflowRunTool;

  // GitHub Search tools
  @InjectTool() gitHubSearchCode: GitHubSearchCodeTool;
  @InjectTool() gitHubSearchRepos: GitHubSearchReposTool;
  @InjectTool() gitHubSearchIssues: GitHubSearchIssuesTool;

  // GitHub Users & Orgs tools
  @InjectTool() gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool;
  @InjectTool() gitHubListUserOrgs: GitHubListUserOrgsTool;

  @InjectWorkflow() oAuth: OAuthWorkflow;

  @State({
    schema: z.object({
      llmResult: z.any().optional(),
      delegateResult: z.any().optional(),
    }),
  })
  state: {
    llmResult?: any;
    delegateResult?: any;
  };

  @Runtime()
  runtime: any;
}
