import { describe, expect, it } from 'vitest';
import { ClaudeToolsModule } from '@loopstack/claude-tools';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { runWorkflow } from '@loopstack/testing';
import { WebSearchExamplesModule } from '../../../web-search-examples.module';
import { SearchStepExampleWorkflow } from '../search-step-example.workflow';

/** Live-LLM check-up (`npm run test:live`, needs ANTHROPIC_API_KEY): the step really searches the web. */
describe('SearchStepExampleWorkflow — live', () => {
  it('returns the hits of a real search', async () => {
    const run = await runWorkflow(SearchStepExampleWorkflow, undefined, {
      imports: [ClaudeToolsModule, LlmProviderModule, WebSearchExamplesModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');

    const { hits } = run.result as { hits: { url: string }[] };
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].url).toMatch(/^https?:\/\//);
  });
});
