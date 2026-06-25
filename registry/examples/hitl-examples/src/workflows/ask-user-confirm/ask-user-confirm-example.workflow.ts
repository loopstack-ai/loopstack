import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerSchema = z.object({ answer: z.string() });

@Workflow({
  title: 'HITL - Ask User Confirm Example',
  description:
    'Shortcut HITL: delegate a yes/no decision to AskUserWorkflow with mode "confirm". ' +
    'The answer comes back as the literal string "yes" or "no".',
})
export class AskUserConfirmExampleWorkflow extends BaseWorkflow {
  constructor(private readonly askUserWorkflow: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_yes_no' })
  async askToSend(_state: Record<string, unknown>) {
    await this.askUserWorkflow.run(
      { question: 'Send the email now?', mode: 'confirm' },
      { callback: { transition: 'decisionReceived' }, show: 'inline', label: 'Waiting for yes/no...' },
    );
  }

  @Transition({
    from: 'waiting_for_yes_no',
    to: 'end',
    wait: true,
    schema: AnswerSchema,
  })
  async decisionReceived(state: Record<string, unknown>, input: TransitionInput<{ answer: string }>) {
    const accepted = input.data.answer === 'yes';
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: accepted ? 'Sending the email now.' : 'Skipping — email was not sent.',
    });
    this.setResult({ sent: accepted } as unknown as Record<string, unknown>);
  }
}
