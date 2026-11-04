import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { runWorkflow } from '@loopstack/testing';
import { WebSearchExamplesModule } from '../../../web-search-examples.module';
import { NativeSearchExampleWorkflow } from '../native-search-example.workflow';

/**
 * Live-LLM check-up (`npm run test:live`, needs ANTHROPIC_API_KEY): Claude really searches the web, so the
 * reply blocks have the shape the workflow reads them in.
 */
describe('NativeSearchExampleWorkflow — live', () => {
  it('returns the queries Claude ran and the sources it found', async () => {
    const run = await runWorkflow(NativeSearchExampleWorkflow, undefined, {
      imports: [LlmProviderModule, WebSearchExamplesModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');

    const result = run.result as { queries: string[]; sources: { url: string }[]; answer: string };
    expect(result.queries.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].url).toMatch(/^https?:\/\//);
    expect(result.answer.length).toBeGreaterThan(0);
  });
});
