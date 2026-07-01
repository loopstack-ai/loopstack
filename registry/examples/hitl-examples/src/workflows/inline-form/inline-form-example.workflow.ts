import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
import { FeedbackFormDocument, FeedbackFormDocumentSchema } from './feedback-form-document.js';

type FeedbackPayload = z.infer<typeof FeedbackFormDocumentSchema>;

@Workflow({
  title: 'HITL - Inline Form Example',
  description:
    'Predefined-workflow HITL: the workflow owns a custom Document with a form widget. ' +
    'The form button triggers a wait:true transition on the same workflow with the form payload as its schema.',
})
export class InlineFormExampleWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting_for_feedback' })
  async showForm() {
    await this.documentStore.save(FeedbackFormDocument, { rating: 3, comment: '' }, { key: 'feedback' });
  }

  @Transition({
    from: 'waiting_for_feedback',
    to: 'end',
    wait: true,
    schema: FeedbackFormDocumentSchema,
  })
  async submitFeedback(state: Record<string, unknown>, input: TransitionInput<FeedbackPayload>) {
    const payload = input.data;
    await this.documentStore.save(FeedbackFormDocument, payload, { key: 'feedback' });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Thanks for your feedback! Rating: ${payload.rating}/5. Comment: ${payload.comment}`,
    });

    this.setResult({ feedback: payload } as unknown as Record<string, unknown>);
  }
}
