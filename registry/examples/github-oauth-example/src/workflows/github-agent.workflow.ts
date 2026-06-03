import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, Guard, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { TemplateRenderFn } from '@loopstack/common';
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

interface GitHubAgentState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'GitHub Agent',
  description:
    'An interactive chat agent with access to GitHub.\nAsk it to manage repositories, issues, pull requests, browse code, check CI/CD status,\nsearch across GitHub, and more. Handles OAuth authentication automatically when needed —\nthe agent detects unauthorized errors and launches authentication on its own.',
  name: 'github_agent',
  widget: __dirname + '/github-agent.ui.yaml',
})
export class GitHubAgentWorkflow extends BaseWorkflow<Record<string, unknown>, GitHubAgentState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly authenticateGitHub: AuthenticateGitHubTask,
    // GitHub Repos tools
    private readonly gitHubListRepos: GitHubListReposTool,
    private readonly gitHubGetRepo: GitHubGetRepoTool,
    private readonly gitHubCreateRepo: GitHubCreateRepoTool,
    private readonly gitHubListBranches: GitHubListBranchesTool,
    // GitHub Issues tools
    private readonly gitHubListIssues: GitHubListIssuesTool,
    private readonly gitHubGetIssue: GitHubGetIssueTool,
    private readonly gitHubCreateIssue: GitHubCreateIssueTool,
    private readonly gitHubCreateIssueComment: GitHubCreateIssueCommentTool,
    // GitHub Pull Requests tools
    private readonly gitHubListPullRequests: GitHubListPullRequestsTool,
    private readonly gitHubGetPullRequest: GitHubGetPullRequestTool,
    private readonly gitHubCreatePullRequest: GitHubCreatePullRequestTool,
    private readonly gitHubMergePullRequest: GitHubMergePullRequestTool,
    private readonly gitHubListPrReviews: GitHubListPrReviewsTool,
    // GitHub Content / Git Ops tools
    private readonly gitHubGetFileContent: GitHubGetFileContentTool,
    private readonly gitHubCreateOrUpdateFile: GitHubCreateOrUpdateFileTool,
    private readonly gitHubListDirectory: GitHubListDirectoryTool,
    private readonly gitHubGetCommit: GitHubGetCommitTool,
    // GitHub Actions tools
    private readonly gitHubListWorkflowRuns: GitHubListWorkflowRunsTool,
    private readonly gitHubTriggerWorkflow: GitHubTriggerWorkflowTool,
    private readonly gitHubGetWorkflowRun: GitHubGetWorkflowRunTool,
    // GitHub Search tools
    private readonly gitHubSearchCode: GitHubSearchCodeTool,
    private readonly gitHubSearchRepos: GitHubSearchReposTool,
    private readonly gitHubSearchIssues: GitHubSearchIssuesTool,
    // GitHub Users & Orgs tools
    private readonly gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool,
    private readonly gitHubListUserOrgs: GitHubListUserOrgsTool,
    private readonly oAuth: OAuthWorkflow,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async setup(state: GitHubAgentState): Promise<GitHubAgentState> {
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: GitHubAgentState, payload: string): Promise<GitHubAgentState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: payload,
    });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: GitHubAgentState): Promise<GitHubAgentState> {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: `You are a helpful GitHub assistant with access to repository, issue, PR, code, actions,
and search tools. When a tool returns an unauthorized error, use authenticateGitHub
to let the user sign in, then retry. Be concise and format results using markdown.`,
          tools: [
            'github_list_repos',
            'github_get_repo',
            'github_create_repo',
            'github_list_branches',
            'github_list_issues',
            'github_get_issue',
            'github_create_issue',
            'github_create_issue_comment',
            'github_list_pull_requests',
            'github_get_pull_request',
            'github_create_pull_request',
            'github_merge_pull_request',
            'github_list_pr_reviews',
            'github_get_file_content',
            'github_create_or_update_file',
            'github_list_directory',
            'github_get_commit',
            'github_list_workflow_runs',
            'github_trigger_workflow',
            'github_get_workflow_run',
            'github_search_code',
            'github_search_repos',
            'github_search_issues',
            'github_get_authenticated_user',
            'github_list_user_orgs',
            'authenticate_github',
          ],
        },
      },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: GitHubAgentState): Promise<GitHubAgentState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    const result = await this.llmDelegateToolCalls.call(
      {
        message: state.llmResult!.message,
        callback: { transition: 'toolResultReceived' },
      },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: GitHubAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(state: GitHubAgentState, payload: Record<string, unknown>): Promise<GitHubAgentState> {
    const result = await this.llmUpdateToolResult.call(
      {
        delegateResult: state.delegateResult!,
        completedTool: payload,
      },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async allToolsCompleteTransition(state: GitHubAgentState): Promise<GitHubAgentState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: state.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });
    return state;
  }

  allToolsComplete(state: GitHubAgentState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond(state: GitHubAgentState): Promise<GitHubAgentState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return state;
  }
}
