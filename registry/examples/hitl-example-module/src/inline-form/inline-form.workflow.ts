import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { FeedbackFormDocument, FeedbackFormDocumentSchema } from './feedback-form-document.js';

type FeedbackPayload = z.infer<typeof FeedbackFormDocumentSchema>;

@Workflow({
  title: 'Inline Form (Document with Widget)',
  description:
    'Predefined-workflow HITL: the workflow owns a custom Document with a form widget. ' +
    'The form button triggers a wait:true transition on the same workflow with the form payload as its schema.',
})
export class InlineFormWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting_for_feedback' })
  async showForm(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.documentStore.save(FeedbackFormDocument, { rating: 3, comment: '' }, { id: 'feedback' });
    return state;
  }

  @Transition({
    from: 'waiting_for_feedback',
    to: 'end',
    wait: true,
    schema: FeedbackFormDocumentSchema,
  })
  async submitFeedback(state: Record<string, unknown>, payload: FeedbackPayload): Promise<unknown> {
    await this.documentStore.save(FeedbackFormDocument, payload, { id: 'feedback' });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Thanks for your feedback! Rating: ${payload.rating}/5. Comment: ${payload.comment}`,
    });

    return { feedback: payload };
  }
}
