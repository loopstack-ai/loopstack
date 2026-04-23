import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
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
import { FailingSubWorkflowTool } from './tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from './tools/runtime-error.tool';
import { StrictSchemaTool } from './tools/strict-schema.tool';

/**
 * Demonstrates how tool errors (validation, runtime, and failed sub-workflows)
 * are handled by DelegateToolCalls and fed back to the LLM for self-correction.
 *
 * The LLM is instructed to deliberately trigger errors first, then correct them.
 * This verifies that all error types produce identical is_error tool results
 * and that the LLM agent loop handles them correctly.
 */
@Workflow({
  uiConfig: __dirname + '/delegate-error.ui.yaml',
})
export class DelegateErrorWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() strictSchema: StrictSchemaTool;
  @InjectTool() runtimeError: RuntimeErrorTool;
  @InjectTool() failingSubWorkflow: FailingSubWorkflowTool;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;
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

    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content:
        'Follow the instructions in your system prompt exactly. ' +
        'Start with step 1: call strictSchema with no arguments.',
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    this.turnCount++;
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      system:
        'You are a test assistant that follows instructions precisely. ' +
        'You are fully autonomous — do NOT ask the user for input or confirmation. ' +
        'Just proceed through each step on your own.\n\n' +
        'Complete these steps IN ORDER. Do exactly one step per turn:\n\n' +
        '1. Call the `strictSchema` tool with NO arguments (empty object {}). This will fail — that is expected.\n' +
        '2. After seeing the validation error, call `strictSchema` correctly with { "name": "World" }.\n' +
        '3. Call the `runtimeError` tool with { "shouldFail": true }. This will fail — that is expected.\n' +
        '4. After seeing the runtime error, call `runtimeError` with { "shouldFail": false }.\n' +
        '5. Call the `failingSubWorkflow` tool with {}. This launches a sub-workflow that will fail — that is expected.\n' +
        '6. After seeing the sub-workflow error, respond with a brief summary of what happened (do NOT call any tools).\n\n' +
        'IMPORTANT: Only perform ONE step per turn. Do NOT skip steps. Do NOT wait for user input between steps.',
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
      tools: ['strictSchema', 'runtimeError', 'failingSubWorkflow'],
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
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
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
}
