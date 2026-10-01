import type Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentEntity } from '@loopstack/common';
import type { LlmProviderRegistry, LlmStreamEvent } from '@loopstack/llm-provider-module';
import { ClaudeClientService } from '../claude-client.service.js';
import { ClaudeLlmProvider } from '../claude-llm-provider.js';

type StreamListener = (payload: unknown) => void;

const usage = {
  input_tokens: 10,
  output_tokens: 5,
  cache_creation_input_tokens: 2,
  cache_read_input_tokens: 3,
};

const message = (content: unknown[], stop_reason: string | null = 'end_turn'): Anthropic.Message =>
  ({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-test',
    content,
    stop_reason,
    usage,
  }) as Anthropic.Message;

const doc = (partial: Partial<DocumentEntity>): DocumentEntity =>
  ({ tags: ['message'], isInvalidated: false, index: 0, meta: null, ...partial }) as DocumentEntity;

describe('ClaudeLlmProvider', () => {
  let provider: ClaudeLlmProvider;
  let response: Anthropic.Message;
  let streamEvents: Array<[string, unknown]>;

  const registry = { register: vi.fn() };
  const stream = vi.fn();
  const create = vi.fn();
  const clientService = {
    getClient: vi.fn(() => ({ messages: { stream, create } })),
    getModel: vi.fn((config?: { model?: string }) => config?.model ?? 'claude-default'),
  };

  const lastStreamParams = () => stream.mock.calls[0][0] as Anthropic.MessageCreateParams;

  beforeEach(() => {
    vi.clearAllMocks();
    response = message([{ type: 'text', text: 'Hello' }]);
    streamEvents = [];

    stream.mockImplementation(() => {
      const listeners = new Map<string, StreamListener>();
      return {
        on: (event: string, listener: StreamListener) => listeners.set(event, listener),
        finalMessage: () => {
          for (const [event, payload] of streamEvents) listeners.get(event)?.(payload);
          return Promise.resolve(response);
        },
      };
    });

    provider = new ClaudeLlmProvider(
      registry as unknown as LlmProviderRegistry,
      clientService as unknown as ClaudeClientService,
    );
  });

  it('registers itself with the provider registry on init', () => {
    provider.onModuleInit();

    expect(provider.providerId).toBe('claude');
    expect(registry.register).toHaveBeenCalledWith(provider);
  });

  describe('generateText', () => {
    it('sends the prompt as a single user message with defaults', async () => {
      const signal = new AbortController().signal;

      const result = await provider.generateText({ prompt: 'Hi' }, { documents: [], signal });

      expect(clientService.getClient).toHaveBeenCalledWith({ model: undefined, envApiKey: undefined });
      expect(stream).toHaveBeenCalledWith(
        { model: 'claude-default', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 4096 },
        { signal },
      );
      expect(result.response).toBe(response);
      expect(result.message).toEqual({
        id: 'msg_1',
        role: 'assistant',
        text: 'Hello',
        blocks: [{ type: 'text', text: 'Hello' }],
        stopReason: 'end_turn',
      });
    });

    it('forwards model, system prompt and provider config', async () => {
      await provider.generateText(
        {
          prompt: 'Hi',
          system: 'Be brief.',
          model: 'claude-x',
          providerConfig: { maxTokens: 100, temperature: 0, stopSequences: ['STOP'], envApiKey: 'MY_KEY' },
        },
        { documents: [] },
      );

      expect(clientService.getClient).toHaveBeenCalledWith({ model: 'claude-x', envApiKey: 'MY_KEY' });
      expect(lastStreamParams()).toEqual({
        model: 'claude-x',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 100,
        system: 'Be brief.',
        temperature: 0,
        stop_sequences: ['STOP'],
      });
    });

    it('prefers the prompt over inline messages', async () => {
      await provider.generateText({ prompt: 'Hi', messages: [{ role: 'user', text: 'ignored' }] }, { documents: [] });

      expect(lastStreamParams().messages).toEqual([{ role: 'user', content: 'Hi' }]);
    });

    it('converts inline messages', async () => {
      await provider.generateText(
        {
          messages: [
            { role: 'user', text: 'Question' },
            { role: 'assistant', text: '', blocks: [{ type: 'tool_call', id: 't1', name: 'lookup', args: { q: 1 } }] },
          ],
        },
        { documents: [] },
      );

      expect(lastStreamParams().messages).toEqual([
        { role: 'user', content: 'Question' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'lookup', input: { q: 1 } }] },
      ]);
    });

    it('resolves history from tagged, valid documents in index order', async () => {
      const documents = [
        doc({ index: 2, content: { role: 'user', text: 'third' } }),
        doc({ index: 0, content: { role: 'user', text: 'first' } }),
        doc({ index: 1, content: { role: 'user', text: 'invalidated' }, isInvalidated: true }),
        doc({ index: 1, content: { role: 'user', text: 'other tag' }, tags: ['note'] }),
        doc({
          index: 1,
          content: { role: 'assistant', text: 'normalized' },
          meta: { response: message([{ type: 'text', text: 'native' }]) },
        }),
        doc({
          index: 3,
          content: {
            role: 'user',
            text: '',
            blocks: [
              { type: 'tool_result', toolCallId: 't1', content: 'ok', isError: false },
              { type: 'tool_result', toolCallId: 't2', content: 'boom', isError: true },
            ],
          },
        }),
      ];

      await provider.generateText({}, { documents });

      expect(lastStreamParams().messages).toEqual([
        { role: 'user', content: 'first' },
        { role: 'assistant', content: [{ type: 'text', text: 'native' }] },
        { role: 'user', content: 'third' },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: 'ok', is_error: false },
            { type: 'tool_result', tool_use_id: 't2', content: 'boom', is_error: true },
          ],
        },
      ]);
    });

    it('filters documents by a custom search tag', async () => {
      const documents = [
        doc({ content: { role: 'user', text: 'default' } }),
        doc({ content: { role: 'user', text: 'custom' }, tags: ['chat'] }),
      ];

      await provider.generateText({ messagesSearchTag: 'chat' }, { documents });

      expect(lastStreamParams().messages).toEqual([{ role: 'user', content: 'custom' }]);
    });

    it('maps local and server tools', async () => {
      const serverTool = { type: 'web_search_20260209', name: 'web_search' };

      await provider.generateText(
        {
          prompt: 'Hi',
          tools: [
            { type: 'tool', name: 'lookup', description: 'Look up', inputSchema: { type: 'object' } },
            { type: 'server_tool', name: 'web_search', config: serverTool },
          ],
        },
        { documents: [] },
      );

      expect(lastStreamParams().tools).toEqual([
        { name: 'lookup', description: 'Look up', input_schema: { type: 'object' } },
        serverTool,
      ]);
    });

    it('applies cache breakpoints when caching is enabled', async () => {
      await provider.generateText(
        {
          prompt: 'Hi',
          system: 'sys',
          tools: [{ type: 'tool', name: 'lookup', description: 'Look up', inputSchema: { type: 'object' } }],
          providerConfig: { cache: true },
        },
        { documents: [] },
      );

      const params = lastStreamParams();
      expect(params.system).toEqual([{ type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } }]);
      expect(params.tools?.[0]).toMatchObject({ cache_control: { type: 'ephemeral' } });
      expect(params.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'Hi', cache_control: { type: 'ephemeral' } }] },
      ]);
    });

    it('normalizes tool_use, thinking and server tool blocks', async () => {
      const searchResults = [{ type: 'web_search_result', url: 'https://a.com', title: 'A' }];
      response = message(
        [
          { type: 'thinking', thinking: 'hmm', signature: 'sig' },
          { type: 'redacted_thinking', data: 'xxx' },
          { type: 'text', text: 'Line 1' },
          { type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'q' } },
          { type: 'web_search_tool_result', tool_use_id: 'srv1', content: searchResults },
          { type: 'text', text: 'Line 2' },
          { type: 'tool_use', id: 't1', name: 'lookup', input: { q: 1 } },
        ],
        'tool_use',
      );

      const { message: normalized } = await provider.generateText({ prompt: 'Hi' }, { documents: [] });

      expect(normalized.text).toBe('Line 1\nLine 2');
      expect(normalized.stopReason).toBe('tool_use');
      expect(normalized.blocks).toEqual([
        { type: 'thinking', text: 'hmm' },
        { type: 'thinking', text: '[Reasoning redacted]' },
        { type: 'text', text: 'Line 1' },
        { type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'q' } },
        { type: 'server_tool_result', toolUseId: 'srv1', content: searchResults },
        { type: 'text', text: 'Line 2' },
        { type: 'tool_call', id: 't1', name: 'lookup', args: { q: 1 } },
      ]);
    });

    it.each(['max_tokens', 'stop_sequence'] as const)('maps the %s stop reason', async (stopReason) => {
      response = message([{ type: 'text', text: 'cut' }], stopReason);

      const { message: normalized } = await provider.generateText({ prompt: 'Hi' }, { documents: [] });

      expect(normalized.stopReason).toBe(stopReason);
    });

    it('defaults the stop reason to end_turn when none is returned', async () => {
      response = message([{ type: 'text', text: 'done' }], null);

      const { message: normalized } = await provider.generateText({ prompt: 'Hi' }, { documents: [] });

      expect(normalized.stopReason).toBe('end_turn');
    });

    it('streams text deltas and completed tool calls', async () => {
      const onStream = vi.fn<(event: LlmStreamEvent) => void>();
      streamEvents = [
        ['text', 'Hel'],
        ['text', ''],
        ['text', 'lo'],
        ['contentBlock', { type: 'text', text: 'Hello' }],
        ['contentBlock', { type: 'tool_use', id: 't1', name: 'lookup', input: { q: 1 } }],
      ];

      await provider.generateText({ prompt: 'Hi', onStream, streamMessageId: 'm1' }, { documents: [] });

      expect(onStream.mock.calls.map(([event]) => event)).toEqual([
        { type: 'text_delta', messageId: 'm1', delta: 'Hel' },
        { type: 'text_delta', messageId: 'm1', delta: 'lo' },
        { type: 'tool_call', messageId: 'm1', id: 't1', name: 'lookup', args: { q: 1 } },
      ]);
    });

    it('does not stream without a stream message id', async () => {
      const onStream = vi.fn();
      streamEvents = [['text', 'Hello']];

      await provider.generateText({ prompt: 'Hi', onStream }, { documents: [] });

      expect(onStream).not.toHaveBeenCalled();
    });
  });

  describe('generateObject', () => {
    const outputSchema = { type: 'object', properties: { name: { type: 'string' } } };

    it('forces the structured_output tool and returns its input', async () => {
      const objectResponse = message([
        { type: 'tool_use', id: 't1', name: 'structured_output', input: { name: 'Ada' } },
      ]);
      create.mockResolvedValue(objectResponse);
      const signal = new AbortController().signal;

      const result = await provider.generateObject(
        {
          prompt: 'Who?',
          system: 'sys',
          model: 'claude-x',
          outputSchema,
          providerConfig: { maxTokens: 50, temperature: 1 },
        },
        { documents: [], signal },
      );

      expect(create).toHaveBeenCalledWith(
        {
          model: 'claude-x',
          messages: [{ role: 'user', content: 'Who?' }],
          max_tokens: 50,
          system: 'sys',
          tools: [
            {
              name: 'structured_output',
              description: 'Return the structured output matching the schema.',
              input_schema: outputSchema,
            },
          ],
          tool_choice: { type: 'tool', name: 'structured_output' },
          temperature: 1,
        },
        { signal },
      );
      expect(result).toEqual({ data: { name: 'Ada' }, response: objectResponse });
    });

    it('applies cache breakpoints when caching is enabled', async () => {
      create.mockResolvedValue(message([{ type: 'tool_use', id: 't1', name: 'structured_output', input: {} }]));

      await provider.generateObject(
        { prompt: 'Who?', outputSchema, providerConfig: { cache: true } },
        { documents: [] },
      );

      const params = create.mock.calls[0][0] as Anthropic.MessageCreateParams;
      expect(params.tools?.[0]).toMatchObject({ cache_control: { type: 'ephemeral' } });
      expect(params.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'Who?', cache_control: { type: 'ephemeral' } }] },
      ]);
    });

    it('throws when no tool_use block is returned', async () => {
      create.mockResolvedValue(message([{ type: 'text', text: 'no' }]));

      await expect(provider.generateObject({ prompt: 'Who?', outputSchema }, { documents: [] })).rejects.toThrow(
        'LLM did not return structured output.',
      );
    });
  });

  describe('extractUsage', () => {
    it('maps Anthropic usage to normalized usage', () => {
      expect(provider.extractUsage(message([]))).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationInputTokens: 2,
        cacheReadInputTokens: 3,
      });
    });

    it('defaults missing cache counters to zero', () => {
      expect(provider.extractUsage({ usage: { input_tokens: 1, output_tokens: 2 } })).toEqual({
        inputTokens: 1,
        outputTokens: 2,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      });
    });

    it.each([undefined, null, {}])('returns undefined without usage (%s)', (value) => {
      expect(provider.extractUsage(value)).toBeUndefined();
    });
  });

  describe('toProviderMessage', () => {
    it('uses plain text content when there are no blocks', () => {
      expect(provider.toProviderMessage({ role: 'user', text: 'Hi' })).toEqual({ role: 'user', content: 'Hi' });
      expect(provider.toProviderMessage({ role: 'assistant', text: 'Yo', blocks: [] })).toEqual({
        role: 'assistant',
        content: 'Yo',
      });
    });

    it('converts text and tool_call blocks', () => {
      expect(
        provider.toProviderMessage({
          role: 'assistant',
          text: 'Calling',
          blocks: [
            { type: 'text', text: 'Calling' },
            { type: 'tool_call', id: 't1', name: 'lookup', args: { q: 1 } },
          ],
        }),
      ).toEqual({
        role: 'assistant',
        content: [
          { type: 'text', text: 'Calling' },
          { type: 'tool_use', id: 't1', name: 'lookup', input: { q: 1 } },
        ],
      });
    });

    it('converts tool_result blocks', () => {
      expect(
        provider.toProviderMessage({
          role: 'user',
          text: '',
          blocks: [{ type: 'tool_result', toolCallId: 't1', content: 'boom', isError: true }],
        }),
      ).toEqual({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 't1', content: 'boom', is_error: true }],
      });
    });
  });
});
