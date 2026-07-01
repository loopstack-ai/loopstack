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
/**
 * Zod schema for `AgentWorkflow` args (what callers pass to `run()`).
 *
 * @public
 */
export const AgentArgsSchema = z.object({
  system: z.string(),
  tools: z.array(z.string()),
  userMessage: z.string(),
  context: z.string().optional(),
});

/**
 * Args for `AgentWorkflow` (passed to `run()`).
 *
 * Holds `system`, `tools`, `userMessage`, and optional `context`.
 *
 * @public
 */
export type AgentArgs = z.infer<typeof AgentArgsSchema>;

/**
 * Zod schema for the result published by AgentWorkflow.
 *
 * Validates a single `response` string holding the final assistant message.
 * Reusable as the `schema:` on a parent's callback wait-transition.
 *
 * @public
 */
export const AgentResultSchema = z.object({ response: z.string() });
/**
 * Result returned by AgentWorkflow, inferred from {@link AgentResultSchema}.
 *
 * Holds the final assistant `response` text.
 *
 * @public
 */
export type AgentResult = z.infer<typeof AgentResultSchema>;

interface AgentState {
  system: string;
  tools: string[];
  userMessage: string;
  context?: string;
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
}

/**
 * Workflow that runs a generic LLM agent loop: prompt the LLM, delegate any tool
 * calls, feed their results back, and repeat until the model returns `end_turn`.
 *
 * Args (per `run()`): `system`, `tools`, `userMessage`, and optional `context`.
 * Tools are resolved from the current workflow first, then from the workspace.
 * On completion it publishes an {@link AgentResult} with the final assistant `response`.
 *
 * @public
 * @providedBy AgentModule
 */
@Workflow({
  name: 'agent',
  title: 'Agent',
  description: 'A generic LLM agent loop with tool calling, error handling, and cancel support.',
  // Cancel button temporarily disabled — see agent.ui.yaml. Clicking it cancels child workflows but
  // does NOT synthesize tool_result blocks for the cancelled tool_use ids, so the next LLM turn
  // returns 400 ("tool_use without matching tool_result"). Re-enable once cancelPendingTools is fixed.
  // widget: './agent.ui.yaml',
  schema: AgentArgsSchema,
})
export class AgentWorkflow extends BaseWorkflow<AgentArgs> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: AgentState, ctx: RunContext<AgentArgs>) {
    if (ctx.args.context) {
      await this.documentStore.save(LlmContextDocument, { role: 'user', text: ctx.args.context });
    }

    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: ctx.args.userMessage });

    this.assignState({ ...ctx.args });
  }

  @Transition({ from: 'ready', to: 'prompt_executed', timeout: 120_000 })
  async llmTurn(state: AgentState) {
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

    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10, timeout: 120_000 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: AgentState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });

    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, timeout: 120_000 })
  async toolResultReceived(state: AgentState, input: TransitionInput) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: input,
    });

    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'ready', timeout: 120_000 })
  @Guard('allToolsComplete')
  toolsComplete(_state: AgentState) {}

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools(state: AgentState, ctx: RunContext) {
    if (ctx.workflowId) {
      await this.orchestrator.cancelChildren(ctx.workflowId);
    }
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  @Guard('isDone')
  respond(state: AgentState) {
    const result: AgentResult = { response: state.llmResult?.message.text ?? '' };
    this.setResult(result);
  }

  private hasToolCalls(state: AgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: AgentState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  private isDone(state: AgentState): boolean {
    return state.llmResult?.message.stopReason === 'end_turn';
  }
}
