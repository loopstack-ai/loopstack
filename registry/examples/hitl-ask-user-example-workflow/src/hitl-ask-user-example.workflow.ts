import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AskUserCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type AskUserCallback = z.infer<typeof AskUserCallbackSchema>;

@Workflow({
  title: 'HITL Ask User Example',
})
export class HitlAskUserExampleWorkflow extends BaseWorkflow {
  constructor(private readonly askUserWorkflow: AskUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_answer' })
  async askQuestion(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.askUserWorkflow.run(
      { question: 'What is your name?' },
      { callback: { transition: 'answerReceived' } },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Asking user a question (sub-workflow ${result.workflowId})...`,
    });

    await this.documentStore.save(
      LinkDocument,
      {
        status: 'pending',
        label: 'Waiting for user answer...',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({
    from: 'waiting_for_answer',
    to: 'end',
    wait: true,
    schema: AskUserCallbackSchema,
  })
  async answerReceived(state: Record<string, unknown>, payload: AskUserCallback): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      {
        status: 'success',
        label: 'User answered',
        workflowId: payload.workflowId,
        embed: true,
        expanded: false,
      },
      { id: `link_${payload.workflowId}` },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Thanks! You answered: ${payload.data.answer}`,
    });
    return {};
  }
}
