import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerSchema = z.object({ answer: z.string() });

const ENV_OPTIONS = ['staging', 'production'];

@Workflow({
  title: 'Ask User — Pick from Options',
  description:
    'Shortcut HITL: delegate a generic "pick from a list" ask to AskUserWorkflow with mode "options". ' +
    'allowCustomAnswer adds a free-text field next to the choices.',
})
export class AskUserOptionsWorkflow extends BaseWorkflow {
  constructor(private readonly askUserWorkflow: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_choice' })
  async askEnvironment(_state: Record<string, unknown>) {
    await this.askUserWorkflow.run(
      {
        question: 'Which environment should we deploy to?',
        mode: 'options',
        options: ENV_OPTIONS,
        allowCustomAnswer: true,
      },
      { callback: { transition: 'choiceReceived' }, show: 'inline', label: 'Waiting for choice...' },
    );
  }

  @Transition({
    from: 'waiting_for_choice',
    to: 'end',
    wait: true,
    schema: AnswerSchema,
  })
  async choiceReceived(state: Record<string, unknown>, input: TransitionInput<{ answer: string }>) {
    const choice = input.data.answer;
    const isCustom = !ENV_OPTIONS.includes(choice);
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: isCustom ? `Custom environment selected: ${choice}` : `Deploying to ${choice}.`,
    });
    this.setResult({ environment: choice, custom: isCustom } as unknown as Record<string, unknown>);
  }
}
