import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type AnswerCallback = z.infer<typeof AnswerCallbackSchema>;

@Workflow({
  title: 'Ask User — Yes / No',
  description:
    'Shortcut HITL: delegate a yes/no decision to AskUserWorkflow with mode "confirm". ' +
    'The answer comes back as the literal string "yes" or "no".',
})
export class AskUserConfirmWorkflow extends BaseWorkflow {
  constructor(private readonly askUserWorkflow: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_yes_no' })
  async askToSend(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.askUserWorkflow.run(
      { question: 'Send the email now?', mode: 'confirm' },
      { callback: { transition: 'decisionReceived' }, show: 'inline', label: 'Waiting for yes/no...' },
    );
    return state;
  }

  @Transition({
    from: 'waiting_for_yes_no',
    to: 'end',
    wait: true,
    schema: AnswerCallbackSchema,
  })
  async decisionReceived(state: Record<string, unknown>, payload: AnswerCallback): Promise<unknown> {
    const accepted = payload.data.answer === 'yes';
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: accepted ? 'Sending the email now.' : 'Skipping — email was not sent.',
    });
    return { sent: accepted };
  }
}
