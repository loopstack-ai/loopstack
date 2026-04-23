import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import { AgentFinishTool } from '../tools/agent-finish.tool';

/**
 * Interactive LLM agent workflow with user chat.
 *
 * Runs an agent loop like AgentWorkflow, but instead of exiting on end_turn,
 * it waits for user input. The user can chat with the agent between LLM turns.
 *
 * Exit behavior is controlled by `taskMode`:
 * - When true, the AgentFinishTool is added to the tool list. The agent exits
 *   when the LLM calls it, returning the finish tool's result.
 * - When false (default), the agent never finishes on its own. The parent
 *   workflow controls the lifecycle.
 *
 * Tools are resolved from the current workflow first, then from the workspace.
 * Register domain-specific tools via @InjectTool() on your workspace.
 */
@Workflow({
  uiConfig: __dirname + '/chat-agent.ui.yaml',
  schema: z.object({
    system: z.string(),
    tools: z.array(z.string()),
    userMessage: z.string(),
    context: z.string().optional(),
    model: z.string().optional(),
    cache: z.boolean().optional(),
    taskMode: z.boolean().optional(),
  }),
})
export class ChatAgentWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() agentFinish: AgentFinishTool;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;
  finishResult?: unknown;

  @Initial({ to: 'ready' })
  async setup(args: { system: string; tools: string[]; userMessage: string; context?: string }) {
    if (args.context) {
      await this.repository.save(
        ClaudeMessageDocument,
        { role: 'user', content: args.context },
        { meta: { hidden: true } },
      );
    }

    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content: args.userMessage,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const args = this.ctx.args as {
      system: string;
      tools: string[];
      model?: string;
      cache?: boolean;
      taskMode?: boolean;
    };

    const tools = args.taskMode ? [...args.tools, 'agentFinish'] : args.tools;

    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      system: args.system,
      claude: {
        model: args.model ?? 'claude-sonnet-4-6',
        cache: args.cache ?? true,
      },
      messagesSearchTag: 'message',
      tools,
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
    this.finishResult = this.extractFinishResult(this.delegateResult);
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(payload: unknown) {
    const result = await this.updateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data as DelegateToolCallsResult;
    this.finishResult = this.extractFinishResult(this.delegateResult);
  }

  @Final({ from: 'awaiting_tools', priority: 20 })
  @Guard('isFinished')
  async finished(): Promise<unknown> {
    return Promise.resolve(this.finishResult);
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete() {}

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools() {
    const workflowId = this.ctx.context.workflowId;
    if (workflowId) {
      await this.orchestrator.cancelChildren(workflowId);
    }
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, {
      id: this.llmResult!.id,
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  private hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  private allToolsComplete(): boolean {
    return !!this.delegateResult?.allCompleted;
  }

  private isFinished(): boolean {
    return !!(this.delegateResult?.allCompleted && this.finishResult !== undefined);
  }

  private extractFinishResult(data: DelegateToolCallsResult | undefined): unknown {
    if (!data?.toolResults?.length) return undefined;
    for (const result of data.toolResults) {
      try {
        const parsed = JSON.parse(result.content as string) as { __agentFinish?: boolean; result?: unknown };
        if (parsed?.__agentFinish) return parsed.result;
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
