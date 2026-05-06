import { z } from 'zod';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import type { AgentRunResult } from '../types';

/**
 * Generic LLM agent workflow.
 *
 * Runs a standard agent loop: LLM → tool calls → loop until done.
 *
 * - **Args** (per-invocation via `run()`): `system`, `tools`, `userMessage`, `context`
 * - **Config** (per-injection via `@InjectWorkflow()`): `provider`, `model`, `providerConfig`
 *
 * Tools are resolved from the current workflow first, then from the workspace.
 * Register domain-specific tools via @InjectTool() on your workspace.
 */
const AgentArgsSchema = z.object({
  system: z.string(),
  tools: z.array(z.string()),
  userMessage: z.string(),
  context: z.string().optional(),
});

const AgentConfigSchema = z.object({
  provider: z.string().default('claude'),
  model: z.string().optional(),
  providerConfig: z.record(z.string(), z.unknown()).optional(),
});

type AgentArgs = z.infer<typeof AgentArgsSchema>;
type AgentConfig = z.infer<typeof AgentConfigSchema>;

@Workflow({
  uiConfig: __dirname + '/agent.ui.yaml',
  schema: AgentArgsSchema,
  configSchema: AgentConfigSchema,
})
export class AgentWorkflow extends BaseWorkflow<AgentArgs, AgentConfig> {
  @InjectTool() llmGenerateText: LlmGenerateTextTool;
  @InjectTool() llmDelegateToolCalls: LlmDelegateToolCallsTool;
  @InjectTool() llmUpdateToolResult: LlmUpdateToolResultTool;

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;

  @Initial({ to: 'ready' })
  async setup(args: AgentArgs) {
    this.assertToolsAvailable(args.tools);

    if (args.context) {
      await this.repository.save(
        LlmMessageDocument,
        { role: 'user', content: args.context },
        { meta: { hidden: true } },
      );
    }

    await this.repository.save(LlmMessageDocument, { role: 'user', content: args.userMessage });
  }

  @Transition({ from: 'ready', to: 'prompt_executed', timeout: 120_000 })
  async llmTurn() {
    const args = this.ctx.args as AgentArgs;
    const config = (this.ctx.config ?? {}) as AgentConfig;

    const result: ToolResult<LlmGenerateTextResult, LlmResultMeta> = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: config.provider ?? 'claude',
          system: args.system,
          tools: args.tools,
          model: config.model,
          providerConfig: config.providerConfig,
        },
      },
    );
    this.llmResult = result.data;
    this.llmMeta = result.metadata;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10, timeout: 120_000 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    // Save assistant message immediately (before tools run)
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });

    const result: ToolResult<LlmDelegateResult> = await this.llmDelegateToolCalls.call({
      message: this.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, timeout: 120_000 })
  async toolResultReceived(payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data as LlmDelegateResult;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready', timeout: 120_000 })
  @Guard('allToolsComplete')
  async toolsComplete() {
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
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: {
        response: this.llmResult!.response,
        provider: this.llmMeta!.provider,
      },
    });
    return { response: this.extractTextResponse() };
  }

  private hasToolCalls(): boolean {
    return this.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(): boolean {
    return !!this.delegateResult?.allCompleted;
  }

  private isEndTurn(): boolean {
    return this.llmResult?.message.stopReason === 'end_turn';
  }

  private extractTextResponse(): string {
    const content = this.llmResult?.message.content;
    if (!content || typeof content === 'string') return (content as string) ?? '';
    return content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');
  }
}
