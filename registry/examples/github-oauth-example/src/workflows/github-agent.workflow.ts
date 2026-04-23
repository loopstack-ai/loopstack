import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
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
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { AuthenticateGitHubTask } from '../tools/authenticate-github-task.tool';

@Workflow({
  uiConfig: __dirname + '/github-agent.ui.yaml',
})
export class GitHubAgentWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
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

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      system: `You are a helpful GitHub assistant with access to repository, issue, PR, code, actions,
and search tools. When a tool returns an unauthorized error, use authenticateGitHub
to let the user sign in, then retry. Be concise and format results using markdown.`,
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
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
    });
    this.llmResult = result.data;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
      message: this.llmResult!,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(payload: Record<string, unknown>) {
    const result: ToolResult<DelegateToolCallsResult> = await this.updateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  allToolsCompleteTransition() {}

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
