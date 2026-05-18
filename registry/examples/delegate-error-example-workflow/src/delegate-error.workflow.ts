import {
  BaseWorkflow,
  Final,
  Guard,
  Initial,
  InjectTool,
  MessageDocument,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { FailingSubWorkflowTool } from './tools/failing-sub-workflow.tool.js';
import { RuntimeErrorTool } from './tools/runtime-error.tool.js';
import { StrictSchemaTool } from './tools/strict-schema.tool.js';

/**
 * Demonstrates how tool errors (validation, runtime, and failed sub-workflows)
 * are handled by DelegateToolCalls and fed back to the LLM for self-correction.
 *
 * The LLM is instructed to deliberately trigger errors first, then correct them.
 * This verifies that all error types produce identical is_error tool results
 * and that the LLM agent loop handles them correctly.
 */
@Workflow({
  uiConfig: import.meta.dirname + '/delegate-error.ui.yaml',
})
export class DelegateErrorWorkflow extends BaseWorkflow {
  @InjectTool({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    tools: ['strictSchema', 'runtimeError', 'failingSubWorkflow'],
  })
  llmGenerateText: LlmGenerateTextTool;
  @InjectTool({ provider: 'claude' }) llmDelegateToolCalls: LlmDelegateToolCallsTool;
  @InjectTool({ provider: 'claude' }) llmUpdateToolResult: LlmUpdateToolResultTool;
  @InjectTool() strictSchema: StrictSchemaTool;
  @InjectTool() runtimeError: RuntimeErrorTool;
  @InjectTool() failingSubWorkflow: FailingSubWorkflowTool;

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
  turnCount!: number;

  @Initial({ to: 'ready' })
  async setup() {
    this.turnCount = 0;

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content:
        '# Delegate Error Handling Example\n\n' +
        'This workflow tests how tool errors are handled and fed back to the LLM.\n\n' +
        'The LLM will deliberately trigger errors, then self-correct.',
    });

    await this.repository.save(LlmMessageDocument, {
      role: 'user',
      content:
        'Follow the instructions in your system prompt exactly. ' +
        'Start with step 1: call strictSchema with no arguments.',
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    this.turnCount++;
    const result: ToolResult<LlmGenerateTextResult, LlmResultMeta> = await this.llmGenerateText.call(
      {},
      {
        config: {
          system: this.render(import.meta.dirname + '/templates/system.md'),
        },
      },
    );
    this.llmResult = result.data;
    this.llmMeta = result.metadata;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });

    const result: ToolResult<LlmDelegateResult> = await this.llmDelegateToolCalls.call({
      message: this.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived(payload: unknown) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data as LlmDelegateResult;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
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
  async respond() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
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
}
