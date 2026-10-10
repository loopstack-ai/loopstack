import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { type TestRun, coverage, replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { MeetingNotesExampleWorkflow } from '../meeting-notes-example.workflow';

const OPTIMIZED = {
  date: '2025-01-01',
  summary: 'Budget review and hiring decision.',
  participants: ['Sarah', 'Anna'],
  decisions: ['Cut costs', 'Hire for marketing'],
  actionItems: ['Anna follows up on vendor pricing'],
};

/** The scripted extraction turn in the shape `llm_generate_object` returns. */
const extraction = () =>
  replay({
    version: 3,
    recordings: [
      {
        tool: 'llm_generate_object',
        envelope: {
          data: { data: OPTIMIZED, response: {} },
          metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
        },
      },
    ],
  });

describe('MeetingNotesExampleWorkflow', () => {
  const runs: TestRun[] = [];

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
        replay: extraction(),
      },
    );
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createForm', 'userResponse', 'optimizeNotes', 'confirm']);
    expect(run.result).toEqual({ optimizedNotes: OPTIMIZED });
    expect(run.document('final')).toEqual(OPTIMIZED);
  });

  it('parks on the notes review form (first park)', async () => {
    const run = await runWorkflow(MeetingNotesExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
    });
    runs.push(run);

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_response');

    const view = run.parkView();
    expect(view).toMatchObject({
      widget: 'form',
      documentName: 'meeting_notes',
      content: { text: expect.stringContaining('Unstructured Notes:') },
      actions: ['Optimize Notes'],
      defaultTransition: 'userResponse',
    });
  });

  it('parks on the optimized-notes confirm form (second park)', async () => {
    const run = await runWorkflow(
      MeetingNotesExampleWorkflow,
      { inputText: 'budget: cut costs' },
      {
        imports: [LlmProviderModule, HitlExamplesModule],
        // Answer the first park but not the second — the run advances through the LLM
        // extraction and parks again on the confirmation form.
        answers: { userResponse: { text: 'Reviewed notes.' } },
        replay: extraction(),
      },
    );
    runs.push(run);

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('notes_optimized');

    const view = run.parkView();
    expect(view).toMatchObject({
      widget: 'form',
      documentName: 'optimized_notes',
      actions: ['Confirm'],
      defaultTransition: 'confirm',
    });
  });

  it('covers every transition and both parks (coverage gate)', () => {
    const cov = coverage(runs, MeetingNotesExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
