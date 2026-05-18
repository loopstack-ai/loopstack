import { z } from 'zod';
import {
  BaseWorkflow,
  DocumentEntity,
  Final,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
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
import { GetSecretKeysTool, RequestSecretsTask, SecretsRequestWorkflow } from '@loopstack/secrets-module';

@Workflow({
  uiConfig: import.meta.dirname + '/secrets-agent-example.ui.yaml',
})
export class SecretsAgentExampleWorkflow extends BaseWorkflow {
  @InjectTool({ provider: 'claude', model: 'claude-haiku-4-5-20251001', tools: ['getSecretKeys', 'requestSecrets'] })
  llmGenerateText: LlmGenerateTextTool;
  @InjectTool({ provider: 'claude' }) llmDelegateToolCalls: LlmDelegateToolCallsTool;
  @InjectTool({ provider: 'claude' }) llmUpdateToolResult: LlmUpdateToolResultTool;
  @InjectTool() requestSecrets: RequestSecretsTask;
  @InjectTool() getSecretKeys: GetSecretKeysTool;
  @InjectWorkflow() secretsRequest: SecretsRequestWorkflow;

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;

  @Initial({ to: 'ready' })
  async setup() {
    await this.repository.save(
      LlmMessageDocument,
      {
        role: 'user',
        content: this.render(import.meta.dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
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

  hasToolCalls(): boolean {
    return this.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(payload: Record<string, unknown>) {
    const result: ToolResult<LlmDelegateResult> = await this.llmUpdateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async allToolsCompleteTransition() {
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

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(LlmMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  @Final({ from: 'prompt_executed' })
  async respond(): Promise<DocumentEntity> {
    return this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
  }
}
