import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Initial,
  InjectWorkflow,
  MessageDocument,
  QueueResult,
  Workflow,
} from '@loopstack/common';
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
  uiConfig: __dirname + '/hitl-confirm-example.ui.yaml',
})
export class HitlConfirmExampleWorkflow extends BaseWorkflow {
  @InjectWorkflow() private confirmUser: ConfirmUserWorkflow;

  @Initial({ to: 'waiting_for_confirmation' })
  async askForConfirmation() {
    const result: QueueResult = await this.confirmUser.run(
      { markdown: MARKDOWN_SUMMARY },
      { alias: 'confirmUser', callback: { transition: 'decisionReceived' } },
    );

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Requesting confirmation (sub-workflow ${result.workflowId})...`,
    });
  }

  @Final({
    from: 'waiting_for_confirmation',
    wait: true,
    schema: ConfirmCallbackSchema,
  })
  async decisionReceived(payload: ConfirmCallback) {
    const content = payload.data.confirmed ? 'User confirmed — proceeding with deploy.' : 'User denied — aborting.';

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content,
    });
  }
}
