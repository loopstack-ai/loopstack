import { Inject } from '@nestjs/common';
import { z } from 'zod';
import type { RunContext, TransitionInput } from '@loopstack/common';
import {
  BaseWorkflow,
  Guard,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmContextDocument,
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { AgentFinishTool } from '../tools/agent-finish.tool.js';

/**
 * Interactive LLM agent workflow with user chat.
 *
 * Runs an agent loop like AgentWorkflow, but instead of exiting on end_turn,
 * it waits for user input. The user can chat with the agent between LLM turns.
 *
 * - **Args** (per-invocation via `run()`): `system`, `tools`, `userMessage`, `context`, `taskMode`, `provider`,
 *   `model`
 *
 * `provider` and `model` default to the `LlmProviderModule` config in scope — the one passed to
 * `AgentModule.forFeature({ llm })`, or the app-wide one.
 *
 * Exit behavior is controlled by `taskMode` arg:
 * - When true, the AgentFinishTool is added to the tool list. The agent exits
 *   when the LLM calls it, returning the finish tool's result.
 * - When false (default), the agent never finishes on its own. The parent
 *   workflow controls the lifecycle.
 *
 * Tool names in `tools` are resolved by their `@Tool({ name })` value from the app-wide tool registry.
 */
/**
 * Zod schema for `ChatAgentWorkflow` args (what callers pass to `run()`).
 *
 * @public
 */
export const ChatAgentArgsSchema = z.object({
  system: z.string(),
  tools: z.array(z.string()),
  userMessage: z.string(),
  context: z.string().optional(),
  taskMode: z.boolean().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/**
 * Args for `ChatAgentWorkflow` (passed to `run()`).
 *
 * Holds `system`, `tools`, `userMessage`, and optional `context`, `taskMode`, `provider` and `model`.
 *
 * @public
 */
export type ChatAgentArgs = z.infer<typeof ChatAgentArgsSchema>;

interface ChatAgentState {
  system: string;
  tools: string[];
  userMessage: string;
  context?: string;
  taskMode?: boolean;
  provider?: string;
  model?: string;
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
  finishResult?: unknown;
}

/**
 * Workflow that runs an interactive LLM agent loop with user chat between turns.
 *
 * Behaves like {@link AgentWorkflow}, but instead of exiting on `end_turn` it
 * transitions to `waiting_for_user` and resumes on the next user message. When
 * the `taskMode` arg is set, the `agent_finish` tool is added and the LLM
 * calling it ends the workflow with that tool's result.
 *
 * @public
 * @providedBy AgentModule
 */
@Workflow({
  name: 'chat_agent',
  title: 'Chat Agent',
  description: 'An interactive LLM agent with user chat and tool calling.',
  widget: './chat-agent.ui.yaml',
  schema: ChatAgentArgsSchema,
})
export class ChatAgentWorkflow extends BaseWorkflow<ChatAgentArgs> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly agentFinish: AgentFinishTool,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ChatAgentState, ctx: RunContext<ChatAgentArgs>) {
    if (ctx.args.context) {
      await this.documentStore.save(LlmContextDocument, { role: 'user', text: ctx.args.context });
    }

    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: ctx.args.userMessage });

    this.assignState({ ...ctx.args });
  }

  @Transition({ from: 'ready', to: 'prompt_executed', timeout: 120_000 })
  async llmTurn(state: ChatAgentState) {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: state.provider,
          model: state.model,
          system: state.system,
          tools: this.offeredTools(state),
        },
      },
    );

    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10, timeout: 120_000 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ChatAgentState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      tools: this.offeredTools(state),
      callback: { transition: 'toolResultReceived' },
    });

    const delegateResult = result.data;
    const finishResult = this.extractFinishResult(delegateResult);

    this.assignState({ delegateResult, finishResult });
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, timeout: 120_000 })
  async toolResultReceived(state: ChatAgentState, payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });

    const delegateResult = result.data;
    const finishResult = this.extractFinishResult(delegateResult);

    this.assignState({ delegateResult, finishResult });
  }

  @Transition({ from: 'awaiting_tools', to: 'end', priority: 20 })
  @Guard('isFinished')
  finished(state: ChatAgentState) {
    this.setResult(state.finishResult as unknown as Record<string, unknown>);
  }

  @Transition({ from: 'awaiting_tools', to: 'ready', timeout: 120_000 })
  @Guard('allToolsComplete')
  toolsComplete(_state: ChatAgentState) {}

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools(state: ChatAgentState, ctx: RunContext) {
    if (ctx.workflowId) {
      await this.orchestrator.cancelChildren(ctx.workflowId);
    }
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  respond(_state: ChatAgentState) {}

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: ChatAgentState, input: TransitionInput<string>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });
  }

  /** The tools the LLM is offered — and the only ones its tool calls may execute. */
  private offeredTools(state: ChatAgentState): string[] {
    return state.taskMode ? [...state.tools, 'agent_finish'] : state.tools;
  }

  private hasToolCalls(state: ChatAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: ChatAgentState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  private isFinished(state: ChatAgentState): boolean {
    return !!(state.delegateResult?.allCompleted && state.finishResult !== undefined);
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
