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
import type { AgentRunResult } from '../types';

/**
 * Generic LLM agent workflow.
 *
 * Runs a standard agent loop: LLM → tool calls → loop until done.
 * Configured entirely via run() args — no subclassing needed.
 *
 * Tools are resolved from the current workflow first, then from the workspace.
 * Register domain-specific tools via @InjectTool() on your workspace.
 *
 * For custom behavior (user interaction, custom exit logic, setup steps):
 * copy this workflow and modify it directly.
 */
@Workflow({
  uiConfig: __dirname + '/agent.ui.yaml',
  schema: z.object({
    system: z.string(),
    tools: z.array(z.string()),
    userMessage: z.string(),
    context: z.string().optional(),
    model: z.string().optional(),
    cache: z.boolean().optional(),
  }),
})
export class AgentWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

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
    const args = this.ctx.args as { system: string; tools: string[]; model?: string; cache?: boolean };
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      system: args.system,
      claude: {
        model: args.model ?? 'claude-sonnet-4-6',
        cache: args.cache ?? true,
      },
      messagesSearchTag: 'message',
      tools: args.tools,
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

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(payload: unknown) {
    const result = await this.updateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data as DelegateToolCallsResult;
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

  @Final({ from: 'prompt_executed' })
  @Guard('isEndTurn')
  async respond(): Promise<AgentRunResult> {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
    return { response: this.extractTextResponse() };
  }

  private hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  private allToolsComplete(): boolean {
    return !!this.delegateResult?.allCompleted;
  }

  private isEndTurn(): boolean {
    return this.llmResult?.stop_reason === 'end_turn';
  }

  private extractTextResponse(): string {
    const content = this.llmResult?.content;
    if (!content) return '';
    if (typeof content === 'string') return content;
    return (content as { type: string; text?: string }[])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n');
  }
}
