import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { MeetingNotesExampleWorkflow } from '../meeting-notes-example.workflow';

const OPTIMIZED = {
  date: '2025-01-01',
  summary: 'Budget review and hiring decision.',
  participants: ['Sarah', 'Anna'],
  decisions: ['Cut costs', 'Hire for marketing'],
  actionItems: ['Anna follows up on vendor pricing'],
};

describe('MeetingNotesExampleWorkflow', () => {
  it('runs the full review flow: edit notes → scripted LLM extraction → confirm', async () => {
    const run = await runWorkflow(
      MeetingNotesExampleWorkflow,
      { inputText: 'budget: cut costs; anna follows up on vendor pricing' },
      {
        imports: [LlmProviderModule, HitlExamplesModule],
        answers: {
          userResponse: { text: 'Reviewed notes: cut costs, Anna follows up on vendor pricing.' },
          confirm: OPTIMIZED,
        },
        replay: replay({
          version: 2,
          recordings: [{ tool: 'llm_generate_object', envelope: { data: { data: OPTIMIZED, response: {} } } }],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createForm', 'userResponse', 'optimizeNotes', 'confirm']);
    expect(run.result).toEqual({ optimizedNotes: OPTIMIZED });
    expect(run.document('final')).toEqual(OPTIMIZED);
  });

  it('parks on the notes review form when no answer is scripted', async () => {
    const run = await runWorkflow(MeetingNotesExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
    });

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_response');
    expect(run.document('input')).toMatchObject({ text: expect.stringContaining('Unstructured Notes:') });
  });
});
