import { Inject } from '@nestjs/common';
import { join } from 'node:path';
import { BaseWorkflow, Guard, MessageDocument, Transition, WORKFLOW_ORCHESTRATOR, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput, WorkflowOrchestrator } from '@loopstack/common';
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

interface AgentErrorHandlingState {
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
  title: 'Advanced Workflows - Agent Error Handling Example',
  description:
    'Exercises every tool-error path in an agent loop — schema validation failures, runtime exceptions, failed sub-workflows — and verifies the LLM receives identical is_error tool_results and can self-correct.',
  widget: './agent-error-handling.ui.yaml',
})
export class AgentErrorHandlingWorkflow extends BaseWorkflow {
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
  async setup() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text:
        '# Agent Error Handling Example\n\n' +
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
  async llmTurn(state: AgentErrorHandlingState) {
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
  async executeToolCalls(state: AgentErrorHandlingState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(state: AgentErrorHandlingState, input: TransitionInput) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: input,
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  toolsComplete() {}

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools(state: AgentErrorHandlingState, ctx: RunContext) {
    await this.orchestrator.cancelChildren(ctx.workflowId);
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  @Guard('isDone')
  respond() {}

  private hasToolCalls(state: AgentErrorHandlingState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: AgentErrorHandlingState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  private isDone(state: AgentErrorHandlingState): boolean {
    return state.llmResult?.message.stopReason === 'end_turn';
  }
}
