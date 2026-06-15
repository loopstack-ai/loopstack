import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type AnswerCallback = z.infer<typeof AnswerCallbackSchema>;

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
  async askEnvironment(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.askUserWorkflow.run(
      {
        question: 'Which environment should we deploy to?',
        mode: 'options',
        options: ENV_OPTIONS,
        allowCustomAnswer: true,
      },
      { callback: { transition: 'choiceReceived' }, show: 'inline', label: 'Waiting for choice...' },
    );
    return state;
  }

  @Transition({
    from: 'waiting_for_choice',
    to: 'end',
    wait: true,
    schema: AnswerCallbackSchema,
  })
  async choiceReceived(state: Record<string, unknown>, payload: AnswerCallback): Promise<unknown> {
    const choice = payload.data.answer;
    const isCustom = !ENV_OPTIONS.includes(choice);
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: isCustom ? `Custom environment selected: ${choice}` : `Deploying to ${choice}.`,
    });
    return { environment: choice, custom: isCustom };
  }
}
