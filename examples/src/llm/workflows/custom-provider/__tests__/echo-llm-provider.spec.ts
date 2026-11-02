import { describe, expect, it, vi } from 'vitest';
import type { DocumentEntity } from '@loopstack/common';
import { LlmProviderRegistry } from '@loopstack/llm-provider';
import type { LlmStreamEvent } from '@loopstack/llm-provider';
import { EchoClient } from '../echo/echo-client';
import { EchoLlmProvider } from '../echo/echo-llm-provider';

/** A saved `LlmMessageDocument`, as `llm_generate_text` and `documentStore.save` write it. */
const messageDoc = (index: number, content: Record<string, unknown>, meta: Record<string, unknown> | null = null) =>
  ({ index, content, meta, tags: ['message'], isInvalidated: false }) as unknown as DocumentEntity;

const setup = () => {
  const client = new EchoClient();
  const provider = new EchoLlmProvider(new LlmProviderRegistry(), client);
  return { client, provider, complete: vi.spyOn(client, 'complete') };
};

describe('EchoLlmProvider', () => {
  it('registers itself under its provider id', () => {
    const registry = new LlmProviderRegistry();
    const provider = new EchoLlmProvider(registry, new EchoClient());

    provider.onModuleInit();

    expect(registry.get('echo')).toBe(provider);
  });

  it('replays only its own responses and converts messages another provider wrote', async () => {
    const { provider, complete } = setup();
    const documents = [
      messageDoc(0, { role: 'user', text: 'First question' }),
      // Written by Claude: its native response is not in the echo format, so it is converted
      messageDoc(
        1,
        {
          role: 'assistant',
          text: 'Claude answer',
          blocks: [
            { type: 'thinking', text: 'Claude reasoning' },
            { type: 'text', text: 'Claude answer' },
          ],
        },
        { provider: 'claude', response: { content: [{ type: 'text', text: 'Claude answer' }] } },
      ),
      messageDoc(2, { role: 'user', text: 'Second question' }),
      // Written by this provider: its native response is passed back as it is
      messageDoc(
        3,
        { role: 'assistant', text: 'normalized text' },
        { provider: 'echo', response: { role: 'assistant', content: 'Echo: Second question' } },
      ),
      messageDoc(4, { role: 'user', text: 'Third question' }),
    ];

    const result = await provider.generateText({ model: 'echo-1' }, { documents });

    expect(complete).toHaveBeenCalledWith({
      model: 'echo-1',
      messages: [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'Claude answer' },
        { role: 'user', content: 'Second question' },
        { role: 'assistant', content: 'Echo: Second question' },
        { role: 'user', content: 'Third question' },
      ],
    });
    expect(result.message).toMatchObject({ role: 'assistant', text: 'Echo: Third question' });
    expect(provider.extractUsage(result.response)).toEqual({ inputTokens: 11, outputTokens: 3 });
  });

  it('streams the reply as text deltas', async () => {
    const { provider } = setup();
    const events: LlmStreamEvent[] = [];

    await provider.generateText(
      { prompt: 'Hi there', streamMessageId: 'm1', onStream: (event) => void events.push(event) },
      { documents: [] },
    );

    expect(events).toEqual([
      { type: 'text_delta', messageId: 'm1', delta: 'Echo: ' },
      { type: 'text_delta', messageId: 'm1', delta: 'Hi ' },
      { type: 'text_delta', messageId: 'm1', delta: 'there' },
    ]);
  });

  it('rejects tools it cannot call, naming them', async () => {
    const { provider } = setup();

    await expect(
      provider.generateText(
        { prompt: 'Search', tools: [{ type: 'server_tool', name: 'web_search', config: {} }] },
        { documents: [] },
      ),
    ).rejects.toThrow('The echo provider cannot call tools: web_search');
  });
});
