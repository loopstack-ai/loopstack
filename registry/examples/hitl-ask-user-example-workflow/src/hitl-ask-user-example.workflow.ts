import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  Final,
  Initial,
  LinkDocument,
  MessageDocument,
  QueueResult,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

const AskUserCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type AskUserCallback = z.infer<typeof AskUserCallbackSchema>;

interface HitlAskUserState {}

@Workflow({
  title: 'HITL Ask User',
  uiConfig: __dirname + '/hitl-ask-user-example.ui.yaml',
})
export class HitlAskUserExampleWorkflow extends BaseWorkflow<Record<string, unknown>, HitlAskUserState> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'waiting_for_answer' })
  async askQuestion(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: HitlAskUserState,
  ): Promise<HitlAskUserState> {
    const result: QueueResult = await this.orchestrator.queue(
      { question: 'What is your name?' },
      { workflowName: AskUserWorkflow.name, callback: { transition: 'answerReceived' } },
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

  @Final({
    from: 'waiting_for_answer',
    wait: true,
    schema: AskUserCallbackSchema,
  })
  async answerReceived(ctx: WorkflowContext, state: HitlAskUserState, payload: AskUserCallback): Promise<unknown> {
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
