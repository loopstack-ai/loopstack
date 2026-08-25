import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { MultiProviderExampleWorkflow } from '../multi-provider-example.workflow';

/** A scripted `llm_generate_text` reply. */
const reply = (text: string) => ({
  tool: 'llm_generate_text',
  envelope: { data: { message: { role: 'assistant', text, blocks: [], stopReason: 'end_turn' }, response: {} } },
});

/**
 * One tool class, two providers: the same `LlmGenerateTextTool` is called twice with a
 * different `provider`/`model` in config. The replay script is a strict ordered sequence,
 * so the first entry answers the Claude call and the second the OpenAI call.
 */
describe('MultiProviderExampleWorkflow', () => {
  it('runs the prompt through Claude then OpenAI and labels both replies', async () => {
    const run = await runWorkflow(
      MultiProviderExampleWorkflow,
      { prompt: 'What is the meaning of life? Answer in one sentence.' },
      {
        imports: [LlmProviderModule, LlmExamplesModule],
        replay: replay({
          version: 3,
          recordings: [reply('42, obviously.'), reply('To seek meaning is the meaning.')],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('**Claude:** 42, obviously.');
    expect(texts).toContain('**OpenAI:** To seek meaning is the meaning.');
  });
});
