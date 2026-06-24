import { Inject } from '@nestjs/common';
import { join } from 'node:path';
import { BaseWorkflow, Guard, MessageDocument, Transition, WORKFLOW_ORCHESTRATOR, Workflow } from '@loopstack/common';
import type { RunContext, WorkflowOrchestrator } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { FailingSubWorkflowTool } from './tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from './tools/runtime-error.tool';
import { StrictSchemaTool } from './tools/strict-schema.tool';

interface DelegateErrorState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
  turnCount: number;
}

/**
 * Demonstrates how tool errors (validation, runtime, and failed sub-workflows)
 * are handled by DelegateToolCalls and fed back to the LLM for self-correction.
 *
 * The LLM is instructed to deliberately trigger errors first, then correct them.
 * This verifies that all error types produce identical is_error tool results
 * and that the LLM agent loop handles them correctly.
 */
@Workflow({
  title: 'Agent - Custom Agent Example',
  description:
    'Builds an agent loop from scratch using delegate primitives — LLM call, guard on tool_use vs end_turn, manual tool delegate, error handling, retry. Also demonstrates how tool errors (validation, runtime, failed sub-workflows) surface to the LLM for self-correction.',
  widget: './custom-agent-example.ui.yaml',
})
export class CustomAgentExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly strictSchema: StrictSchemaTool,
    private readonly runtimeError: RuntimeErrorTool,
    private readonly failingSubWorkflow: FailingSubWorkflowTool,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(_state: DelegateErrorState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '# Delegate Error Handling Example\n\n' +
        'This workflow tests how tool errors are handled and fed back to the LLM.\n\n' +
        'The LLM will deliberately trigger errors, then self-correct.',
    });

    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      text:
        'Follow the instructions in your system prompt exactly. ' +
        'Start with step 1: call strictSchema with no arguments.',
    });
    this.assignState({ turnCount: 0 });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: DelegateErrorState) {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: this.render(join(__dirname, 'templates', 'system.md')),
          tools: ['strict_schema', 'runtime_error', 'failing_sub_workflow'],
        },
      },
    );
    this.assignState({
      turnCount: state.turnCount + 1,
      llmResult: result.data,
    });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: DelegateErrorState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(state: DelegateErrorState, payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  toolsComplete(_state: DelegateErrorState) {}

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools(state: DelegateErrorState, ctx: RunContext) {
    await this.orchestrator.cancelChildren(ctx.workflowId);
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  @Guard('isEndTurn')
  respond(_state: DelegateErrorState) {}

  private hasToolCalls(state: DelegateErrorState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: DelegateErrorState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  private isEndTurn(state: DelegateErrorState): boolean {
    return state.llmResult?.message.stopReason === 'end_turn';
  }
}
