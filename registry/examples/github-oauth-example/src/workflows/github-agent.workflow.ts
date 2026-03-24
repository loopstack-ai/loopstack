import { z } from 'zod';
import {
  AiGenerateText,
  AiMessageDocument,
  AiMessageDocumentContentType,
  DelegateToolCall,
} from '@loopstack/ai-module';
import {
  DefineHelper,
  InjectDocument,
  InjectTool,
  Runtime,
  State,
  ToolResult,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { TransitionPayload } from '@loopstack/contracts/schemas';
import { ExecuteWorkflowAsync } from '@loopstack/core';
import { CreateDocument, LinkDocument } from '@loopstack/core-ui-module';
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

@Workflow({
  configFile: __dirname + '/github-agent.workflow.yaml',
})
export class GitHubAgentWorkflow implements WorkflowInterface {
  // AI tools
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectTool() delegateToolCall: DelegateToolCall;
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() executeWorkflowAsync: ExecuteWorkflowAsync;

  // Documents
  @InjectDocument() aiMessageDocument: AiMessageDocument;
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

  @State({
    schema: z
      .object({
        requiresAuthentication: z.boolean().optional(),
      })
      .strict(),
  })
  state: {
    requiresAuthentication?: boolean;
  };

  @DefineHelper()
  isToolCall(message: { parts?: { type: string }[] } | null | undefined): boolean {
    return message?.parts?.some((part) => part.type.startsWith('tool-')) ?? false;
  }

  @DefineHelper()
  checkAuthError(message: { parts?: { type: string; output?: { value?: string } }[] } | null | undefined): boolean {
    return (
      message?.parts?.some((part) => {
        if (!part.output?.value) return false;
        try {
          const parsed = JSON.parse(part.output.value) as { error?: string };
          return parsed.error === 'unauthorized' || parsed.error === '401';
        } catch {
          return false;
        }
      }) ?? false
    );
  }

  @Runtime()
  runtime: {
    tools: {
      llm_turn: { llm_call: ToolResult<AiMessageDocumentContentType> };
      execute_tool_calls: { delegate: ToolResult<AiMessageDocumentContentType> };
    };
    transition: TransitionPayload;
  };
}
