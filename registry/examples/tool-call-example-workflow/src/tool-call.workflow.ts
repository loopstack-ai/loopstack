import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Guard, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmDelegateToolCallsTool, LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { GetWeather } from './tools/get-weather.tool';

interface ToolCallState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
}

@Workflow({
  title: 'LLM Tool Calling Example (Berlin Weather)',
  description:
    'An example workflow that demonstrates how to use an LLM to call external tools and handle their responses.',
})
export class ToolCallWorkflow extends BaseWorkflow<Record<string, unknown>, ToolCallState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: 'How is the weather in Berlin?' });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: ToolCallState): Promise<ToolCallState> {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    const result = await this.llmDelegateToolCalls.call(
      { message: state.llmResult!.message },
      { config: { provider: 'claude' } },
    );
    return { ...state, delegateResult: result.data };
  }

  hasToolCalls(state: ToolCallState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete(state: ToolCallState): Promise<ToolCallState> {
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

  allToolsComplete(state: ToolCallState): boolean {
    return state.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: ToolCallState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
