import { z } from 'zod';
import {
  BaseWorkflow,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
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
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { AuthenticateGitHubTask } from '../tools/authenticate-github-task.tool';

@Workflow({
  uiConfig: __dirname + '/github-agent.ui.yaml',
})
export class GitHubAgentWorkflow extends BaseWorkflow {
  @InjectTool({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    system: `You are a helpful GitHub assistant with access to repository, issue, PR, code, actions,
and search tools. When a tool returns an unauthorized error, use authenticateGitHub
to let the user sign in, then retry. Be concise and format results using markdown.`,
    tools: [
      'gitHubListRepos',
      'gitHubGetRepo',
      'gitHubCreateRepo',
      'gitHubListBranches',
      'gitHubListIssues',
      'gitHubGetIssue',
      'gitHubCreateIssue',
      'gitHubCreateIssueComment',
      'gitHubListPullRequests',
      'gitHubGetPullRequest',
      'gitHubCreatePullRequest',
      'gitHubMergePullRequest',
      'gitHubListPrReviews',
      'gitHubGetFileContent',
      'gitHubCreateOrUpdateFile',
      'gitHubListDirectory',
      'gitHubGetCommit',
      'gitHubListWorkflowRuns',
      'gitHubTriggerWorkflow',
      'gitHubGetWorkflowRun',
      'gitHubSearchCode',
      'gitHubSearchRepos',
      'gitHubSearchIssues',
      'gitHubGetAuthenticatedUser',
      'gitHubListUserOrgs',
      'authenticateGitHub',
    ],
  })
  llmGenerateText: LlmGenerateTextTool;
  @InjectTool({ provider: 'claude' }) llmDelegateToolCalls: LlmDelegateToolCallsTool;
  @InjectTool({ provider: 'claude' }) llmUpdateToolResult: LlmUpdateToolResultTool;
  @InjectTool() authenticateGitHub: AuthenticateGitHubTask;

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

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      LlmMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(LlmMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<LlmGenerateTextResult, LlmResultMeta> = await this.llmGenerateText.call();
    this.llmResult = result.data;
    this.llmMeta = result.metadata;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
    const result: ToolResult<LlmDelegateResult> = await this.llmDelegateToolCalls.call({
      message: this.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(payload: Record<string, unknown>) {
    const result: ToolResult<LlmDelegateResult> = await this.llmUpdateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async allToolsCompleteTransition() {
    await this.repository.save(LlmMessageDocument, {
      role: 'user',
      content: this.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });
  }

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
  }
}
