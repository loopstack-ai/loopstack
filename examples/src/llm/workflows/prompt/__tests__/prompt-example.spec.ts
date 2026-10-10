import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { PromptExampleWorkflow } from '../prompt-example.workflow';

/**
 * The "hello world" of LLM testing: replay a single `llm_generate_text` response so the
 * workflow runs deterministically with no API key. The workflow's own code — prompt
 * rendering, result mapping — still runs for real; only the model call is scripted.
 */
describe('PromptExampleWorkflow', () => {
  it('maps the replayed haiku into the result', async () => {
    const run = await runWorkflow(
      PromptExampleWorkflow,
      { subject: 'coffee' },
      {
        imports: [LlmProviderModule, LlmExamplesModule],
        replay: replay({
          version: 3,
          recordings: [
            {
              tool: 'llm_generate_text',
              envelope: {
                data: {
                  message: {
                    role: 'assistant',
                    text: 'Dark roast at sunrise\nsteam curls above the warm cup\nthe day finds its start',
                    blocks: [],
                    stopReason: 'end_turn',
                  },
                  response: {},
                },
              },
            },
          ],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toMatchObject({ text: expect.stringContaining('Dark roast at sunrise') });
  });
});
