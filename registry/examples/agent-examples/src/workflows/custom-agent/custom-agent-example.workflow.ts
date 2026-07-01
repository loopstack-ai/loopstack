import { join } from 'node:path';
import { BaseWorkflow, Guard, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';

const MAX_TURNS = 2;

interface CustomAgentState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
  turnCount: number;
}

/**
 * Custom agent loop with a deterministic turn budget and a forced wrap-up phase.
 *
 * The generic `AgentWorkflow` only exits when the LLM emits `end_turn`. This example
 * shows what a hand-rolled loop unlocks: after `MAX_TURNS` tool-using turns, the
 * workflow stops the loop itself and runs one final LLM call with a different
 * system prompt and no tools, asking the model to summarize whatever it has so far.
 *
 * Two distinct LLM phases (loop with tools → wrap-up without tools) cannot be
 * expressed by a single `AgentWorkflow.run(...)` call, which is the motivation for
 * building a custom agent.
 */
@Workflow({
  title: 'Agent - Custom Agent Example',
  description:
    'A from-scratch agent loop with a deterministic turn budget. After N tool-using turns the workflow forces a wrap-up LLM call with a different system prompt and no tools — illustrating a control-flow shape the generic AgentWorkflow cannot express.',
})
export class CustomAgentExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
  ) {
    super();
  }

  /**
   * Initial transition. Renders an introductory note for the user, seeds the
   * conversation with the user's request, and initialises the turn counter.
   */
  @Transition({ to: 'ready' })
  async setup() {
    await this.documentStore.save(MarkdownDocument, {
      markdown:
        '# Custom Agent Example\n\n' +
        `This agent has a budget of **${MAX_TURNS} tool-using turns**. ` +
        'Once the budget is hit, the workflow forces a final summary turn with no tools available.',
    });

    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      text:
        'I want to travel somewhere warm. Find me the first city of at least 25°C from this list, ' +
        'trying them one at a time in order: London, New York, Paris, Berlin, Tokyo. ' +
        'After each lookup, decide based on the temperature whether to keep searching.',
    });

    this.assignState({ turnCount: 0 });
  }

  /**
   * Main loop turn. While the budget allows it, runs a normal LLM call with the
   * full tool set and increments the turn counter. The next state is decided
   * by the guards on transitions out of `prompt_executed`.
   */
  @Transition({ from: 'ready', to: 'prompt_executed', priority: 10 })
  @Guard('hasBudget')
  async llmTurn(state: CustomAgentState) {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          system: this.render(join(__dirname, 'templates', 'system.md')),
          tools: ['weather_lookup', 'calculator'],
        },
      },
    );

    this.assignState({
      turnCount: state.turnCount + 1,
      llmResult: result.data,
    });
  }

  /**
   * Fires the moment the budget is exhausted. Appends a user-role
   * `LlmMessageDocument` telling the model the budget is gone (so the model
   * itself sees the constraint, not just the system prompt). Kept as its own
   * short transition so the message renders in the UI immediately, without
   * waiting for the slower wrap-up LLM call that follows.
   */
  @Transition({ from: 'ready', to: 'over_budget' })
  @Guard('isOverBudget')
  async notifyOverBudget() {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      text:
        `You have used your full turn budget of ${MAX_TURNS} tool-using turns and can no longer call tools. ` +
        'Summarise what you found so far in plain text and answer based on that.',
    });
  }

  /**
   * Forced final turn after the budget notice has rendered. Runs one last LLM
   * call with the wrap-up system prompt and no tools, asking for a plain-text
   * summary based on whatever results were gathered before the budget hit.
   */
  @Transition({ from: 'over_budget', to: 'end' })
  async wrapUp() {
    await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          system: this.render(join(__dirname, 'templates', 'wrap-up.md')),
          tools: [],
        },
      },
    );
  }

  /**
   * The LLM asked to call one or more tools. Hands the assistant message to
   * `LlmDelegateToolCalls`, which dispatches each tool concurrently and reports
   * back via the `toolResultReceived` callback.
   */
  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: CustomAgentState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  /**
   * Wait-transition fired once per completed tool. Folds the result back into
   * the `delegateResult` aggregate so we know which tool_use ids are still
   * outstanding and when every call has finished.
   */
  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(state: CustomAgentState, input: TransitionInput) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: input,
    });
    this.assignState({ delegateResult: result.data });
  }

  /**
   * Every tool dispatched in this turn has reported back. Hands control back
   * to `ready` so the loop can decide whether to keep going or wrap up.
   */
  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  toolsComplete() {}

  /**
   * The LLM emitted `end_turn` instead of more tool calls — it considers the
   * task finished. The text response was already persisted by `llmTurn`, so we
   * just close the workflow.
   */
  @Transition({ from: 'prompt_executed', to: 'end' })
  @Guard('isDone')
  respond() {}

  /** True while the model is still allowed to take another tool-using turn. */
  private hasBudget(state: CustomAgentState): boolean {
    return state.turnCount < MAX_TURNS;
  }

  /** Inverse of {@link hasBudget} — gates the forced `wrapUp` transition. */
  private isOverBudget(state: CustomAgentState): boolean {
    return state.turnCount >= MAX_TURNS;
  }

  /** True when the last LLM response asked to call one or more tools. */
  private hasToolCalls(state: CustomAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  /** True when every tool dispatched in the current turn has reported back. */
  private allToolsComplete(state: CustomAgentState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  /** True when the last LLM response was a final plain-text answer (no tools). */
  private isDone(state: CustomAgentState): boolean {
    return state.llmResult?.message.stopReason === 'end_turn';
  }
}
