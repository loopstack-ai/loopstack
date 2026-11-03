import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { runWorkflow } from '@loopstack/testing';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { PromptCachingExampleWorkflow } from '../prompt-caching-example.workflow';

interface CallUsage {
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

/**
 * Live-LLM check-up (`npm run test:live`, needs ANTHROPIC_API_KEY): both calls go to the real
 * model. The first call writes the handbook to the cache and the second call reads it, which
 * also shows that the handbook is longer than the model's minimum cacheable prompt.
 *
 * A cache entry lives for five minutes. A run within five minutes of an earlier run reads the
 * handbook already in the first call, so the first call is checked to write or read the cache.
 */
describe('PromptCachingExampleWorkflow — live', () => {
  it('writes the shared system prompt to the cache in the first call and reads it in the second', async () => {
    const run = await runWorkflow(PromptCachingExampleWorkflow, undefined, {
      imports: [LlmProviderModule, LlmExamplesModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');

    const [first, second] = (run.result as { calls: CallUsage[] }).calls;
    expect(first.cacheCreationInputTokens + first.cacheReadInputTokens).toBeGreaterThan(1024);
    expect(second.cacheReadInputTokens).toBeGreaterThan(1024);
  });
});
