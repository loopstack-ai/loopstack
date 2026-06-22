import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { LlmGenerateTextResult } from '@loopstack/llm-provider-module';
import { LlmDelegateToolCallsTool, LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { GetWeather } from './tools/get-weather.tool';

interface ToolCallState {
  llmResult?: LlmGenerateTextResult;
}

@Workflow({
  title: 'LLM Tool Calling Example (Berlin Weather)',
  description:
    'An example workflow that demonstrates how to use an LLM to call external tools and handle their responses.',
})
export class ToolCallWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly getWeather: GetWeather,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ToolCallState): Promise<ToolCallState> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: 'How is the weather in Berlin?' });
    return state;
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn(state: ToolCallState): Promise<ToolCallState> {
    const result = await this.llmGenerateText.call(
      {},
      { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather'] } },
    );
    return { ...state, llmResult: result.data };
  }

  @Transition({ from: 'prompt_executed', to: 'ready', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ToolCallState): Promise<ToolCallState> {
    await this.llmDelegateToolCalls.call({ message: state.llmResult!.message });
    return state;
  }

  hasToolCalls(state: ToolCallState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(_state: ToolCallState): Promise<unknown> {
    return {};
  }
}
