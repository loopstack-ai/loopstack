import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AnswerSchema = z.object({ answer: z.string() });

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
  async askName(_state: Record<string, unknown>) {
    await this.askUserWorkflow.run(
      { question: 'What is your name?' },
      { callback: { transition: 'answerReceived' }, show: 'inline', label: 'Waiting for answer...' },
    );
  }

  @Transition({
    from: 'waiting_for_answer',
    to: 'end',
    wait: true,
    schema: AnswerSchema,
  })
  async answerReceived(state: Record<string, unknown>, input: TransitionInput<{ answer: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Hello, ${input.data.answer}!`,
    });
    this.setResult({ name: input.data.answer } as unknown as Record<string, unknown>);
  }
}
