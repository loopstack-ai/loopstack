import { Inject } from '@nestjs/common';
import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import {
  BaseWorkflow,
  Guard,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import type { AgentRunResult } from '../types/index.js';

/**
 * Generic LLM agent workflow.
 *
 * Runs a standard agent loop: LLM → tool calls → loop until done.
 *
 * - **Args** (per-invocation via `run()`): `system`, `tools`, `userMessage`, `context`
 * - **Config** (per-injection via `@InjectWorkflow()`): `provider`, `model`, `providerConfig`
 *
 * Tools are resolved from the current workflow first, then from the workspace.
 */
const AgentArgsSchema = z.object({
  system: z.string(),
  tools: z.array(z.string()),
  userMessage: z.string(),
  context: z.string().optional(),
});

type AgentArgs = z.infer<typeof AgentArgsSchema>;

interface AgentState {
  system: string;
  tools: string[];
  userMessage: string;
  context?: string;
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'Agent',
  description: 'A generic LLM agent loop with tool calling, error handling, and cancel support.',
  widget: import.meta.dirname + '/agent.ui.yaml',
  schema: AgentArgsSchema,
})
export class AgentWorkflow extends BaseWorkflow<AgentArgs, AgentState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: AgentState, ctx: RunContext): Promise<AgentState> {
    const args = ctx.args as AgentArgs;
    if (args.context) {
      await this.documentStore.save(
        LlmMessageDocument,
        { role: 'user', content: args.context },
        { meta: { hidden: true } },
      );
    }

    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: args.userMessage });

    return { ...state, ...args };
  }

  @Transition({ from: 'ready', to: 'prompt_executed', timeout: 120_000 })
  async llmTurn(state: AgentState): Promise<AgentState> {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          system: state.system,
          tools: state.tools,
        },
      },
    );

    return { ...state, llmResult: result.data, llmMeta: result.metadata };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10, timeout: 120_000 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: AgentState): Promise<AgentState> {
    // Save assistant message immediately (before tools run)
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });

    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });

    return { ...state, delegateResult: result.data };
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, timeout: 120_000 })
  async toolResultReceived(state: AgentState, payload: unknown): Promise<AgentState> {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });

    return { ...state, delegateResult: result.data as LlmDelegateResult };
  }

  @Transition({ from: 'awaiting_tools', to: 'ready', timeout: 120_000 })
  @Guard('allToolsComplete')
  async toolsComplete(state: AgentState): Promise<AgentState> {
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

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools(state: AgentState, ctx: RunContext): Promise<AgentState> {
    if (ctx.workflowId) {
      await this.orchestrator.cancelChildren(ctx.workflowId);
    }
    return state;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  @Guard('isEndTurn')
  async respond(state: AgentState): Promise<AgentRunResult> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: {
        response: state.llmResult!.response,
        provider: state.llmMeta!.provider,
      },
    });
    return { response: this.extractTextResponse(state) };
  }

  private hasToolCalls(state: AgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: AgentState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  private isEndTurn(state: AgentState): boolean {
    return state.llmResult?.message.stopReason === 'end_turn';
  }

  private extractTextResponse(state: AgentState): string {
    const content = state.llmResult?.message.content;
    if (!content || typeof content === 'string') return (content as string) ?? '';
    return content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');
  }
}
