import { LlmResponseMessageInterface, LlmToolCallInterface, PromptResponseInterface } from '@loopstack/llm';

export function createMockPromptResponse(
  content: string | null,
  toolCalls: LlmToolCallInterface[] | null = null
): PromptResponseInterface<LlmResponseMessageInterface> {
  return {
    messages: [],
    response: {
      data: {
        role: 'assistant',
        content,
        tool_calls: toolCalls,
      },
      metadata: {},
    },
    cache: {
      hit: false,
      hash: '123'
    },
  };
}