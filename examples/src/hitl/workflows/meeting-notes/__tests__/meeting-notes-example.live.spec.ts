import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { MeetingNotesExampleWorkflow } from '../meeting-notes-example.workflow';

/**
 * Live-LLM check-up (`npm run test:live`, needs ANTHROPIC_API_KEY): the extraction step runs
 * against the real model. Assertions are structural — path taken, schema shape — never exact
 * content.
 */
describe('MeetingNotesExampleWorkflow — live', () => {
  it('extracts structured notes from the real model', async () => {
    const confirmSubmission = {
      date: '2025-01-01',
      summary: 'Confirmed as submitted.',
      participants: ['Sarah'],
      decisions: ['Cut costs'],
      actionItems: ['Anna follows up on vendor pricing'],
    };

    const run = await runWorkflow(MeetingNotesExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
      answers: {
        userResponse: { text: 'Budget meeting: Sarah said cut costs. Anna follows up on vendor pricing.' },
        confirm: confirmSubmission,
      },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createForm', 'userResponse', 'optimizeNotes', 'confirm']);

    // The live extraction produced a schema-valid document before the user confirmed
    const optimizedDocs = run.documents.filter((d) => Array.isArray((d.content as { decisions?: unknown }).decisions));
    expect(optimizedDocs.length).toBeGreaterThan(0);
  });
});
