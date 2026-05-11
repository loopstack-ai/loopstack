import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Initial,
  InjectWorkflow,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Workflow,
} from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AskUserCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type AskUserCallback = z.infer<typeof AskUserCallbackSchema>;

@Workflow({
  uiConfig: __dirname + '/hitl-ask-user-example.ui.yaml',
})
export class HitlAskUserExampleWorkflow extends BaseWorkflow {
  @InjectWorkflow() private askUser: AskUserWorkflow;

  @Initial({ to: 'waiting_for_answer' })
  async askQuestion() {
    const result: QueueResult = await this.askUser.run(
      { question: 'What is your name?' },
      { alias: 'askUser', callback: { transition: 'answerReceived' } },
    );

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Asking user a question (sub-workflow ${result.workflowId})...`,
    });

    await this.repository.save(
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
  }

  @Final({
    from: 'waiting_for_answer',
    wait: true,
    schema: AskUserCallbackSchema,
  })
  async answerReceived(payload: AskUserCallback) {
    await this.repository.save(
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

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Thanks! You answered: ${payload.data.answer}`,
    });
  }
}
