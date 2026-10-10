import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { WebModule } from '@loopstack/web-module';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { WebFetchExampleWorkflow } from '../web-fetch-example.workflow';

const SUMMARY = '- Loopstack builds AI workflows\n- Open source\n- TypeScript-first';

/**
 * `web_fetch` reaches the network and calls a model — both external. Replaying its envelope
 * makes the whole flow hermetic; the workflow's branching and result mapping run for real.
 * The envelope carries the tool's full result contract (validated against its resultSchema).
 */
describe('WebFetchExampleWorkflow', () => {
  it('summarizes the replayed fetch result', async () => {
    const run = await runWorkflow(
      WebFetchExampleWorkflow,
      { url: 'https://loopstack.ai', prompt: 'Summarize this page in 3 bullet points.' },
      {
        imports: [WebModule, LlmProviderModule, LlmExamplesModule],
        replay: replay({
          version: 3,
          recordings: [
            {
              tool: 'web_fetch',
              envelope: {
                data: {
                  url: 'https://loopstack.ai',
                  bytes: 2048,
                  code: 200,
                  codeText: 'OK',
                  contentType: 'text/html',
                  result: SUMMARY,
                  truncated: false,
                  cached: false,
                  durationMs: 120,
                },
              },
            },
          ],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toMatchObject({ url: 'https://loopstack.ai', summary: SUMMARY });
  });
});
