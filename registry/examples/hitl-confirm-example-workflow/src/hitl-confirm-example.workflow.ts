import { z } from 'zod';
import { BaseWorkflow, CallbackSchema, MessageDocument, QueueResult, Transition, Workflow } from '@loopstack/common';
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
  constructor(private readonly confirmUserWorkflow: ConfirmUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_confirmation' })
  async askForConfirmation(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result: QueueResult = await this.confirmUserWorkflow.run(
      { markdown: MARKDOWN_SUMMARY },
      { callback: { transition: 'decisionReceived' }, show: 'inline', label: 'Waiting for user confirmation...' },
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Requesting confirmation (sub-workflow ${result.workflowId})...`,
    });
    return state;
  }

  @Transition({
    from: 'waiting_for_confirmation',
    to: 'end',
    wait: true,
    schema: ConfirmCallbackSchema,
  })
  async decisionReceived(state: Record<string, unknown>, payload: ConfirmCallback): Promise<unknown> {
    const text = payload.data.confirmed ? 'User confirmed — proceeding with deploy.' : 'User denied — aborting.';

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text,
    });
    return {};
  }
}
