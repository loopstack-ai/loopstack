import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { ConfirmUserWorkflow } from '@loopstack/hitl';

const ConfirmCallbackSchema = CallbackSchema.extend({
  data: z.object({ confirmed: z.boolean(), markdown: z.string() }),
});

type ConfirmCallback = z.infer<typeof ConfirmCallbackSchema>;

const MARKDOWN_SUMMARY = `## Ready to deploy?

We're about to deploy **v1.2.3** to production.

- 3 commits since last release
- Smoke tests passing

Proceed?`;

@Workflow({
  title: 'HITL Confirm Example',
})
export class HitlConfirmExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly confirmUserWorkflow: ConfirmUserWorkflow,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'waiting_for_confirmation' })
  async askForConfirmation(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.confirmUserWorkflow.run(
      { markdown: MARKDOWN_SUMMARY },
      { callback: { transition: 'decisionReceived' } },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Requesting confirmation (sub-workflow ${result.workflowId})...`,
    });

    await this.documentStore.save(
      LinkDocument,
      {
        status: 'pending',
        label: 'Waiting for user confirmation...',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  @Transition({
    from: 'waiting_for_confirmation',
    to: 'end',
    wait: true,
    schema: ConfirmCallbackSchema,
  })
  async decisionReceived(state: Record<string, unknown>, payload: ConfirmCallback): Promise<unknown> {
    await this.documentStore.save(
      LinkDocument,
      {
        status: 'success',
        label: payload.data.confirmed ? 'User confirmed' : 'User denied',
        workflowId: payload.workflowId,
        embed: true,
        expanded: false,
      },
      { id: `link_${payload.workflowId}` },
    );

    const content = payload.data.confirmed ? 'User confirmed — proceeding with deploy.' : 'User denied — aborting.';

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content,
    });
    return {};
  }
}
