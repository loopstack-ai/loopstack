import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { InlineFormExampleWorkflow } from '../inline-form-example.workflow';

describe('InlineFormExampleWorkflow', () => {
  it('submits the form via a scripted answer and completes', async () => {
    const feedback = { subject: 'Loopstack HITL forms', rating: 5, comment: 'Great!' };

    const run = await runWorkflow(InlineFormExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
      answers: { submitFeedback: feedback },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['showForm', 'submitFeedback']);
    expect(run.result).toEqual({ feedback });
    expect(run.document('feedback')).toEqual(feedback);
  });

  it('parks on the form when no answer is scripted', async () => {
    const run = await runWorkflow(InlineFormExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
    });

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_feedback');
    // The form document is pre-filled with the workflow-provided subject
    expect(run.document('feedback')).toMatchObject({ subject: 'Loopstack HITL forms', rating: 3 });
  });
});
