import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  DocumentEntity,
  Guard,
  TEMPLATE_RENDERER,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { GetSecretKeysTool, RequestSecretsTask, SecretsRequestWorkflow } from '@loopstack/secrets-module';

interface SecretsAgentState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'Secrets Agent Example',
  description:
    'An agent workflow where the LLM autonomously manages secrets by calling\ngetSecretKeys and requestSecrets tools. The user can send follow-up messages.',
  widget: __dirname + '/secrets-agent-example.ui.yaml',
})
export class SecretsAgentExampleWorkflow extends BaseWorkflow<Record<string, unknown>, SecretsAgentState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly requestSecrets: RequestSecretsTask,
    private readonly getSecretKeys: GetSecretKeysTool,
    private readonly secretsRequest: SecretsRequestWorkflow,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: SecretsAgentState): Promise<SecretsAgentState> {
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: SecretsAgentState): Promise<SecretsAgentState> {
    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-haiku-4-5-20251001',
          tools: ['get_secret_keys', 'request_secrets_task'],
          system: this.render(__dirname + '/templates/system.md'),
        },
      },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: SecretsAgentState): Promise<SecretsAgentState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    const result = await this.llmDelegateToolCalls.call(
      {
        message: state.llmResult!.message,
        callback: { transition: 'toolResultReceived' },
      },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: SecretsAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(state: SecretsAgentState, payload: Record<string, unknown>): Promise<SecretsAgentState> {
    const result = await this.llmUpdateToolResult.call(
      {
        delegateResult: state.delegateResult!,
        completedTool: payload,
      },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async allToolsCompleteTransition(state: SecretsAgentState): Promise<SecretsAgentState> {
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

  allToolsComplete(state: SecretsAgentState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: SecretsAgentState, payload: string): Promise<SecretsAgentState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      content: payload,
    });
    return state;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: SecretsAgentState): Promise<DocumentEntity> {
    return this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
  }
}
