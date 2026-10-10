import type OpenAI from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentEntity } from '@loopstack/common';
import type { LlmContext, LlmProviderRegistry, LlmStreamEvent } from '@loopstack/llm-provider';
import { OpenAiClientService } from '../openai-client.service.js';
import { OpenAiLlmProvider } from '../openai-llm-provider.js';

const completion = (
  message: Partial<OpenAI.ChatCompletionMessage>,
  finishReason: OpenAI.ChatCompletion.Choice['finish_reason'] = 'stop',
  extra: Partial<OpenAI.ChatCompletion> = {},
): OpenAI.ChatCompletion => ({
  id: 'chatcmpl-1',
  object: 'chat.completion',
  created: 1,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: null, refusal: null, ...message },
      finish_reason: finishReason,
      logprobs: null,
    },
  ],
  ...extra,
});

const doc = (overrides: Partial<DocumentEntity>): DocumentEntity =>
  ({ isInvalidated: false, tags: ['message'], index: 0, meta: null, ...overrides }) as DocumentEntity;

async function* streamOf(chunks: Array<Partial<OpenAI.ChatCompletionChunk>>) {
  for (const chunk of chunks) {
    yield { id: 'chatcmpl-s', created: 5, choices: [], ...chunk } as OpenAI.ChatCompletionChunk;
  }
}

describe('OpenAiLlmProvider', () => {
  let provider: OpenAiLlmProvider;

  const create = vi.fn();
  const mockClientService = {
    getClient: vi.fn(),
    getModel: vi.fn(),
  };
  const mockRegistry = { register: vi.fn() };
  const ctx: LlmContext = { documents: [] };

  const lastRequest = () => create.mock.calls[0][0] as OpenAI.ChatCompletionCreateParams;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClientService.getClient.mockReturnValue({ chat: { completions: { create } } });
    mockClientService.getModel.mockImplementation(
      (config?: { model?: string }, defaultModel?: string) => config?.model ?? defaultModel,
    );
    create.mockResolvedValue(completion({ content: 'Hello' }));

    provider = new OpenAiLlmProvider(
      mockRegistry as unknown as LlmProviderRegistry,
      mockClientService as unknown as OpenAiClientService,
    );
  });

  it('registers itself with the provider registry on module init', () => {
    provider.onModuleInit();

    expect(mockRegistry.register).toHaveBeenCalledWith(provider);
    expect(provider.providerId).toBe('openai');
  });

  describe('generateText', () => {
    it('builds the request from prompt, system prompt and provider config', async () => {
      const signal = new AbortController().signal;

      await provider.generateText(
        {
          system: 'Be brief.',
          prompt: 'Hi',
          model: 'gpt-4o-mini',
          providerConfig: {
            envApiKey: 'MY_KEY',
            maxTokens: 100,
            temperature: 0.2,
            stopSequences: ['END'],
            frequencyPenalty: 0.5,
            presencePenalty: 0.3,
          },
        },
        { documents: [], signal },
      );

      expect(mockClientService.getClient).toHaveBeenCalledWith({ model: 'gpt-4o-mini', envApiKey: 'MY_KEY' });
      expect(mockClientService.getModel).toHaveBeenCalledWith({ model: 'gpt-4o-mini', envApiKey: 'MY_KEY' }, 'gpt-4o');
      expect(create).toHaveBeenCalledWith(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Be brief.' },
            { role: 'user', content: 'Hi' },
          ],
          max_tokens: 100,
          temperature: 0.2,
          stop: ['END'],
          frequency_penalty: 0.5,
          presence_penalty: 0.3,
        },
        { signal },
      );
    });

    it('defaults max_tokens and omits unset options', async () => {
      await provider.generateText({ prompt: 'Hi' }, ctx);

      expect(lastRequest()).toEqual({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 4096,
      });
    });

    it('maps inline messages when no prompt is given', async () => {
      await provider.generateText(
        {
          messages: [
            { role: 'user', text: 'Question' },
            { role: 'assistant', text: 'Answer' },
            { role: 'user', blocks: [{ type: 'text', text: 'ignored' }] },
          ],
        },
        ctx,
      );

      expect(lastRequest().messages).toEqual([
        { role: 'user', content: 'Question' },
        { role: 'assistant', content: 'Answer' },
        { role: 'user', content: '' },
      ]);
    });

    it('resolves message history from tagged, valid documents in index order', async () => {
      const nativeMessage = {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'lookup', arguments: '{}' } }],
      };
      const documents = [
        doc({
          index: 2,
          content: {
            role: 'user',
            text: '',
            blocks: [{ type: 'tool_result', toolCallId: 'call_1', content: 'found', isError: false }],
          },
        }),
        doc({
          index: 1,
          content: { role: 'assistant', text: '' },
          meta: { response: completion(nativeMessage as OpenAI.ChatCompletionMessage) },
        }),
        doc({ index: 0, content: { role: 'user', text: 'Find it' } }),
        doc({ index: 3, content: { role: 'user', text: 'stale' }, isInvalidated: true }),
        doc({ index: 4, content: { role: 'user', text: 'other tag' }, tags: ['note'] }),
      ];

      await provider.generateText({}, { documents });

      expect(lastRequest().messages).toEqual([
        { role: 'user', content: 'Find it' },
        nativeMessage,
        { role: 'tool', tool_call_id: 'call_1', content: 'found' },
      ]);
    });

    it('uses messagesSearchTag to select history documents', async () => {
      const documents = [
        doc({ index: 0, content: { role: 'user', text: 'default' } }),
        doc({ index: 1, content: { role: 'user', text: 'custom' }, tags: ['chat'] }),
      ];

      await provider.generateText({ messagesSearchTag: 'chat' }, { documents });

      expect(lastRequest().messages).toEqual([{ role: 'user', content: 'custom' }]);
    });

    it('maps function tools and drops server tools', async () => {
      const inputSchema = { type: 'object', properties: { q: { type: 'string' } } };

      await provider.generateText(
        {
          prompt: 'Hi',
          tools: [
            { type: 'tool', name: 'search', description: 'Search things', inputSchema },
            { type: 'server_tool', name: 'web_search', config: {} },
          ],
        },
        ctx,
      );

      expect(lastRequest()).toMatchObject({
        tools: [
          { type: 'function', function: { name: 'search', description: 'Search things', parameters: inputSchema } },
        ],
      });
    });

    it('omits tools when only server tools are given', async () => {
      await provider.generateText(
        { prompt: 'Hi', tools: [{ type: 'server_tool', name: 'web_search', config: {} }] },
        ctx,
      );

      expect(lastRequest()).not.toHaveProperty('tools');
    });

    it('normalizes a text response and returns the native response', async () => {
      const response = completion({ content: 'Hello' });
      create.mockResolvedValue(response);

      const result = await provider.generateText({ prompt: 'Hi' }, ctx);

      expect(result).toEqual({
        message: {
          id: 'chatcmpl-1',
          role: 'assistant',
          text: 'Hello',
          blocks: [{ type: 'text', text: 'Hello' }],
          stopReason: 'end_turn',
        },
        response,
      });
    });

    it('normalizes tool calls from choice.message.tool_calls', async () => {
      create.mockResolvedValue(
        completion(
          {
            content: 'Let me check.',
            tool_calls: [
              { id: 'call_1', type: 'function', function: { name: 'search', arguments: '{"q":"cats"}' } },
              { id: 'call_2', type: 'function', function: { name: 'broken', arguments: '{not json' } },
            ],
          },
          'tool_calls',
        ),
      );

      const { message } = await provider.generateText({ prompt: 'Hi' }, ctx);

      expect(message.stopReason).toBe('tool_use');
      expect(message.text).toBe('Let me check.');
      expect(message.blocks).toEqual([
        { type: 'text', text: 'Let me check.' },
        { type: 'tool_call', id: 'call_1', name: 'search', args: { q: 'cats' } },
        { type: 'tool_call', id: 'call_2', name: 'broken', args: {} },
      ]);
    });

    it('includes refusals as text', async () => {
      create.mockResolvedValue(completion({ content: 'Partial', refusal: 'I cannot help.' }));

      const { message } = await provider.generateText({ prompt: 'Hi' }, ctx);

      expect(message.text).toBe('Partial\nI cannot help.');
      expect(message.blocks).toEqual([
        { type: 'text', text: 'Partial' },
        { type: 'text', text: 'I cannot help.' },
      ]);
    });

    it.each([
      ['stop', 'end_turn'],
      ['tool_calls', 'tool_use'],
      ['length', 'max_tokens'],
    ] as const)('maps finish reason %s to %s', async (finishReason, stopReason) => {
      create.mockResolvedValue(completion({ content: 'x' }, finishReason));

      const { message } = await provider.generateText({ prompt: 'Hi' }, ctx);

      expect(message.stopReason).toBe(stopReason);
    });

    it('throws when no choices are returned', async () => {
      create.mockResolvedValue({ ...completion({}), choices: [] });

      await expect(provider.generateText({ prompt: 'Hi' }, ctx)).rejects.toThrow('OpenAI returned no choices.');
    });

    it('propagates client service errors', async () => {
      mockClientService.getClient.mockImplementation(() => {
        throw new Error('No API key found!');
      });

      await expect(provider.generateText({ prompt: 'Hi' }, ctx)).rejects.toThrow('No API key found!');
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('generateText streaming', () => {
    const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };

    it('streams deltas and assembles the final completion', async () => {
      create.mockResolvedValue(
        streamOf([
          { choices: [{ index: 0, delta: { content: 'Hel' }, finish_reason: null }] },
          { choices: [{ index: 0, delta: { content: 'lo' }, finish_reason: null }] },
          {
            choices: [
              {
                index: 0,
                delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'search', arguments: '{"q":' } }] },
                finish_reason: null,
              },
            ],
          },
          {
            choices: [
              {
                index: 0,
                delta: { tool_calls: [{ index: 0, function: { arguments: '"cats"}' } }] },
                finish_reason: null,
              },
            ],
          },
          { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
          { choices: [], usage },
        ]),
      );
      const events: LlmStreamEvent[] = [];
      const signal = new AbortController().signal;

      const result = await provider.generateText(
        { prompt: 'Hi', streamMessageId: 'msg-1', onStream: (event) => void events.push(event) },
        { documents: [], signal },
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ stream: true, stream_options: { include_usage: true } }),
        { signal },
      );
      expect(events).toEqual([
        { type: 'text_delta', messageId: 'msg-1', delta: 'Hel' },
        { type: 'text_delta', messageId: 'msg-1', delta: 'lo' },
        { type: 'tool_call', messageId: 'msg-1', id: 'call_1', name: 'search', args: { q: 'cats' } },
      ]);
      expect(result.message).toEqual({
        id: 'chatcmpl-s',
        role: 'assistant',
        text: 'Hello',
        blocks: [
          { type: 'text', text: 'Hello' },
          { type: 'tool_call', id: 'call_1', name: 'search', args: { q: 'cats' } },
        ],
        stopReason: 'tool_use',
      });
      expect(result.response).toMatchObject({ id: 'chatcmpl-s', model: 'gpt-4o', created: 5, usage });
    });

    it('does not stream without a streamMessageId', async () => {
      const onStream = vi.fn();

      await provider.generateText({ prompt: 'Hi', onStream }, ctx);

      expect(lastRequest()).not.toHaveProperty('stream');
      expect(onStream).not.toHaveBeenCalled();
    });
  });

  describe('generateObject', () => {
    const outputSchema = { type: 'object', properties: { name: { type: 'string' } } };

    it('requests a strict json_schema response and parses the content', async () => {
      const response = completion({ content: '{"name":"Ada"}' });
      create.mockResolvedValue(response);
      const signal = new AbortController().signal;

      const result = await provider.generateObject(
        { system: 'Extract.', prompt: 'Ada Lovelace', outputSchema, providerConfig: { temperature: 0 } },
        { documents: [], signal },
      );

      expect(create).toHaveBeenCalledWith(
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Extract.' },
            { role: 'user', content: 'Ada Lovelace' },
          ],
          max_tokens: 4096,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'structured_output', schema: outputSchema, strict: true },
          },
          temperature: 0,
        },
        { signal },
      );
      expect(result).toEqual({ data: { name: 'Ada' }, response });
    });

    it('throws when no content is returned', async () => {
      create.mockResolvedValue(completion({ content: null }));

      await expect(provider.generateObject({ prompt: 'x', outputSchema }, ctx)).rejects.toThrow(
        'OpenAI returned no structured output.',
      );
    });

    it('throws on invalid JSON', async () => {
      create.mockResolvedValue(completion({ content: 'not json' }));

      await expect(provider.generateObject({ prompt: 'x', outputSchema }, ctx)).rejects.toThrow(
        'OpenAI returned invalid JSON for structured output.',
      );
    });
  });

  describe('extractUsage', () => {
    it('returns undefined without usage', () => {
      expect(provider.extractUsage(undefined)).toBeUndefined();
      expect(provider.extractUsage(completion({}))).toBeUndefined();
    });

    it('splits cached and reasoning tokens', () => {
      const response = completion({}, 'stop', {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 40,
          total_tokens: 140,
          prompt_tokens_details: { cached_tokens: 30 },
          completion_tokens_details: { reasoning_tokens: 12 },
        },
      });

      expect(provider.extractUsage(response)).toEqual({
        inputTokens: 70,
        outputTokens: 40,
        cacheReadInputTokens: 30,
        reasoningTokens: 12,
      });
    });

    it('defaults missing details to zero', () => {
      const response = completion({}, 'stop', {
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      expect(provider.extractUsage(response)).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        cacheReadInputTokens: 0,
        reasoningTokens: 0,
      });
    });
  });

  describe('toProviderMessage', () => {
    it.each(['user', 'assistant'] as const)('maps a %s text message', (role) => {
      expect(provider.toProviderMessage({ role, text: 'Hello' })).toEqual({ role, content: 'Hello' });
    });
  });
});
