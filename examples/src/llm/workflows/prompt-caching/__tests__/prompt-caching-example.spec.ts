import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { replay, runWorkflow } from '@loopstack/testing';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { PromptCachingExampleWorkflow } from '../prompt-caching-example.workflow';

const handbook = readFileSync(join(__dirname, '..', 'templates', 'handbook.md'), 'utf-8');

/**
 * A scripted `llm_generate_text` reply. `config` is asserted against the actual call, so the
 * recording fails with a replay drift if a call drops `cache: true` or sends a different system
 * prompt. `usage` is what the Claude provider reports for a cache write or a cache read.
 */
const reply = (text: string, usage: { cacheCreationInputTokens: number; cacheReadInputTokens: number }) => ({
  tool: 'llm_generate_text',
  config: {
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    system: handbook,
    providerConfig: { cache: true },
  },
  envelope: {
    data: { message: { role: 'assistant', text, blocks: [], stopReason: 'end_turn' }, response: {} },
    metadata: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      usage: { inputTokens: 20, outputTokens: 30, ...usage },
    },
  },
});

describe('PromptCachingExampleWorkflow', () => {
  it('sends both questions with caching on and reports the cache tokens of each call', async () => {
    const run = await runWorkflow(
      PromptCachingExampleWorkflow,
      { firstQuestion: 'How much is a day pass?', secondQuestion: 'Can I carry a child?' },
      {
        imports: [LlmProviderModule, LlmExamplesModule],
        replay: replay({
          version: 3,
          recordings: [
            reply('A day pass costs 9.00 EUR.', { cacheCreationInputTokens: 1726, cacheReadInputTokens: 0 }),
            reply('No, children may not be carried.', { cacheCreationInputTokens: 14, cacheReadInputTokens: 1712 }),
          ],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({
      calls: [
        {
          question: 'How much is a day pass?',
          answer: 'A day pass costs 9.00 EUR.',
          cacheCreationInputTokens: 1726,
          cacheReadInputTokens: 0,
        },
        {
          question: 'Can I carry a child?',
          answer: 'No, children may not be carried.',
          cacheCreationInputTokens: 14,
          cacheReadInputTokens: 1712,
        },
      ],
    });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain(
      '**Call 1:** cache write 1726 tokens, cache read 0 tokens\n\n' +
        '**Call 2:** cache write 14 tokens, cache read 1712 tokens',
    );
  });
});
