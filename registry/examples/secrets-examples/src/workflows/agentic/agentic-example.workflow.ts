import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import {
  LlmContextDocument,
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { GetSecretKeysTool, RequestSecretsTask, SecretsRequestWorkflow } from '@loopstack/secrets-module';

interface AgenticState {
  llmResult?: LlmGenerateTextResult;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'Secrets - Agentic Example',
  description:
    'An agent workflow where the LLM autonomously manages secrets by calling getSecretKeys and requestSecrets tools. The user can send follow-up messages.',
  widget: './agentic-example.ui.yaml',
})
export class AgenticExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly requestSecrets: RequestSecretsTask,
    private readonly getSecretKeys: GetSecretKeysTool,
    private readonly secretsRequest: SecretsRequestWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(_state: AgenticState) {
    await this.documentStore.save(LlmContextDocument, {
      role: 'user',
      text: this.render(join(__dirname, 'templates', 'systemMessage.md')),
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(_state: AgenticState) {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-haiku-4-5-20251001',
          tools: ['get_secret_keys', 'request_secrets_task'],
          system: this.render(join(__dirname, 'templates', 'system.md')),
        },
      },
    );
    this.assignState({ llmResult: result.data });
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: AgenticState) {
    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });
    this.assignState({ delegateResult: result.data });
  }

  hasToolCalls(state: AgenticState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(state: AgenticState, payload: Record<string, unknown>) {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });
    this.assignState({ delegateResult: result.data });
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  allToolsCompleteTransition(_state: AgenticState) {}

  allToolsComplete(state: AgenticState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: AgenticState, payload: string) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: payload });
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  respond(_state: AgenticState) {}
}
