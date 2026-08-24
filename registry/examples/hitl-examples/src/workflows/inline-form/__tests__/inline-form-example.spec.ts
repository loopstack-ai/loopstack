import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { InlineFormExampleWorkflow } from '../inline-form-example.workflow';

describe('InlineFormExampleWorkflow', () => {
  const runs: TestRun[] = [];

  it('submits the form via a scripted answer and completes', async () => {
    const feedback = { subject: 'Loopstack HITL forms', rating: 5, comment: 'Great!' };

    const run = await runWorkflow(InlineFormExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
      answers: { submitFeedback: feedback },
    });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['showForm', 'submitFeedback']);
    expect(run.result).toEqual({ feedback });
    expect(run.document('feedback')).toEqual(feedback);
  });

  it('parks on the pre-filled form when no answer is scripted', async () => {
    const run = await runWorkflow(InlineFormExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
    });
    runs.push(run);

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_feedback');

    // The custom form widget the user would fill in — its Submit action binds to the
    // workflow's own wait transition, pre-filled with the workflow-provided subject.
    // (The `subject` field's `readonly` rule is enforced by the form widget / API layer,
    // not the state machine, so it isn't exercised here.)
    const view = run.parkView();
    expect(view).toMatchObject({
      widget: 'form',
      documentName: 'feedback_form',
      content: { subject: 'Loopstack HITL forms', rating: 3 },
      actions: ['Submit Feedback'],
      defaultTransition: 'submitFeedback',
    });
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, InlineFormExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
