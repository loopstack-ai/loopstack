import { describe, expect, it } from 'vitest';
import { ClaudeToolsModule } from '@loopstack/claude-tools';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { replay, runWorkflow } from '@loopstack/testing';
import { WebSearchExamplesModule } from '../../../web-search-examples.module';
import { SearchStepExampleWorkflow } from '../search-step-example.workflow';

/**
 * `claude_web_search_step` makes its own Claude request — external. Replaying its envelope makes the run
 * hermetic; the workflow's call and its rendering of the hits run for real. The envelope carries the tool's
 * full result contract (validated against its resultSchema), and `args` asserts the query the workflow sent.
 */
describe('SearchStepExampleWorkflow', () => {
  it('calls the search step with the query and renders the hits as links', async () => {
    const run = await runWorkflow(
      SearchStepExampleWorkflow,
      { query: 'latest Node.js release' },
      {
        imports: [ClaudeToolsModule, LlmProviderModule, WebSearchExamplesModule],
        replay: replay({
          version: 3,
          recordings: [
            {
              tool: 'claude_web_search_step',
              args: { query: 'latest Node.js release' },
              envelope: {
                data: {
                  query: 'latest Node.js release',
                  results: [
                    'Searching for the latest release.',
                    {
                      tool_use_id: 'srvtoolu_1',
                      content: [
                        { title: 'Node.js — Releases', url: 'https://nodejs.org/en/about/previous-releases' },
                        { title: 'Node.js Blog', url: 'https://nodejs.org/en/blog' },
                      ],
                    },
                    'The latest stable release is Node.js 26.',
                  ],
                  sourcesReminder: 'REMINDER: You MUST include the sources above in your response.',
                  durationSeconds: 2.5,
                },
              },
            },
          ],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({
      query: 'latest Node.js release',
      hits: [
        { title: 'Node.js — Releases', url: 'https://nodejs.org/en/about/previous-releases' },
        { title: 'Node.js Blog', url: 'https://nodejs.org/en/blog' },
      ],
    });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain(
      '**Results for "latest Node.js release"**\n\n' +
        '- [Node.js — Releases](https://nodejs.org/en/about/previous-releases)\n' +
        '- [Node.js Blog](https://nodejs.org/en/blog)',
    );
  });
});
