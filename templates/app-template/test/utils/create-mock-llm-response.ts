import {
  LlmResponseMessageInterface,
  LlmToolCallInterface,
  CacheResponse,
} from '@loopstack/llm';

export function createMockPromptResponse(
  content: string | null,
  toolCalls: LlmToolCallInterface[] | null = null,
): CacheResponse<LlmResponseMessageInterface> {
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
      hash: '123',
    },
  };
}
