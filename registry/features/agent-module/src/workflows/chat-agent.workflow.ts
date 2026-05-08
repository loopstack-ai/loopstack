import { z } from 'zod';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { AgentFinishTool } from '../tools/agent-finish.tool';

/**
 * Interactive LLM agent workflow with user chat.
 *
 * Runs an agent loop like AgentWorkflow, but instead of exiting on end_turn,
 * it waits for user input. The user can chat with the agent between LLM turns.
 *
 * - **Args** (per-invocation via `run()`): `system`, `tools`, `userMessage`, `context`
 * - **Config** (per-injection via `@InjectWorkflow()`): `provider`, `model`, `providerConfig`, `taskMode`
 *
 * Exit behavior is controlled by `taskMode` config:
 * - When true, the AgentFinishTool is added to the tool list. The agent exits
 *   when the LLM calls it, returning the finish tool's result.
 * - When false (default), the agent never finishes on its own. The parent
 *   workflow controls the lifecycle.
 *
 * Tools are resolved from the current workflow first, then from the workspace.
 * Register domain-specific tools via @InjectTool() on your workspace.
 */
const ChatAgentArgsSchema = z.object({
  system: z.string(),
  tools: z.array(z.string()),
  userMessage: z.string(),
  context: z.string().optional(),
});

const ChatAgentConfigSchema = z.object({
  provider: z.string().default('claude'),
  model: z.string().optional(),
  providerConfig: z.record(z.string(), z.unknown()).optional(),
  taskMode: z.boolean().optional(),
});

type ChatAgentArgs = z.infer<typeof ChatAgentArgsSchema>;
type ChatAgentConfig = z.infer<typeof ChatAgentConfigSchema>;

@Workflow({
  uiConfig: __dirname + '/chat-agent.ui.yaml',
  schema: ChatAgentArgsSchema,
  configSchema: ChatAgentConfigSchema,
})
export class ChatAgentWorkflow extends BaseWorkflow<ChatAgentArgs, ChatAgentConfig> {
  @InjectTool() llmGenerateText: LlmGenerateTextTool;
  @InjectTool() llmDelegateToolCalls: LlmDelegateToolCallsTool;
  @InjectTool() llmUpdateToolResult: LlmUpdateToolResultTool;
  @InjectTool() agentFinish: AgentFinishTool;

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
  finishResult?: unknown;

  @Initial({ to: 'ready' })
  async setup(args: ChatAgentArgs) {
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
    const args = this.ctx.args as ChatAgentArgs;
    const config = (this.ctx.config ?? {}) as ChatAgentConfig;

    const tools = config.taskMode ? [...args.tools, 'agentFinish'] : args.tools;

    const result: ToolResult<LlmGenerateTextResult, LlmResultMeta> = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: config.provider ?? 'claude',
          system: args.system,
          tools,
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
    this.finishResult = this.extractFinishResult(this.delegateResult);
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, timeout: 120_000 })
  async toolResultReceived(payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data as LlmDelegateResult;
    this.finishResult = this.extractFinishResult(this.delegateResult);
  }

  @Final({ from: 'awaiting_tools', priority: 20 })
  @Guard('isFinished')
  async finished(): Promise<unknown> {
    return Promise.resolve(this.finishResult);
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

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: {
        response: this.llmResult!.response,
        provider: this.llmMeta!.provider,
      },
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(LlmMessageDocument, { role: 'user', content: payload });
  }

  private hasToolCalls(): boolean {
    return this.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(): boolean {
    return !!this.delegateResult?.allCompleted;
  }

  private isFinished(): boolean {
    return !!(this.delegateResult?.allCompleted && this.finishResult !== undefined);
  }

  private extractFinishResult(data: LlmDelegateResult | undefined): unknown {
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
