import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type AnswerCallback = z.infer<typeof AnswerCallbackSchema>;

@Workflow({
  title: 'Ask User — Free Text',
  description:
    'Shortcut HITL: delegate a generic free-text ask to AskUserWorkflow. The parent only owns the ' +
    'callback transition. Use the inline-form pattern instead when you need a structured form.',
})
export class AskUserTextWorkflow extends BaseWorkflow {
  constructor(private readonly askUserWorkflow: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_answer' })
  async askName(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.askUserWorkflow.run(
      { question: 'What is your name?' },
      { callback: { transition: 'answerReceived' }, show: 'inline', label: 'Waiting for answer...' },
    );
    return state;
  }

  @Transition({
    from: 'waiting_for_answer',
    to: 'end',
    wait: true,
    schema: AnswerCallbackSchema,
  })
  async answerReceived(state: Record<string, unknown>, payload: AnswerCallback): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Hello, ${payload.data.answer}!`,
    });
    return { name: payload.data.answer };
  }
}
