import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { ConfirmUserWorkflow } from '@loopstack/hitl';

const ConfirmSchema = z.object({ confirmed: z.boolean(), markdown: z.string() });
type ConfirmData = z.infer<typeof ConfirmSchema>;

const DEPLOY_SUMMARY = `## Ready to deploy?

We're about to deploy **v1.2.3** to production.

- 3 commits since last release
- Smoke tests passing

Proceed?`;

@Workflow({
  title: 'Confirm Content (Markdown Review)',
  description:
    'Shortcut HITL: hand a pre-rendered markdown blob to ConfirmUserWorkflow for a user-facing review/confirm. ' +
    'Useful for showing a release plan, a summary, or a code-diff for explicit approval.',
})
export class ConfirmContentWorkflow extends BaseWorkflow {
  constructor(private readonly confirmUserWorkflow: ConfirmUserWorkflow) {
    super();
  }

  @Transition({ to: 'waiting_for_confirmation' })
  async showSummary(_state: Record<string, unknown>) {
    await this.confirmUserWorkflow.run(
      { markdown: DEPLOY_SUMMARY },
      { callback: { transition: 'decisionReceived' }, show: 'inline', label: 'Waiting for confirmation...' },
    );
  }

  @Transition({
    from: 'waiting_for_confirmation',
    to: 'end',
    wait: true,
    schema: ConfirmSchema,
  })
  async decisionReceived(state: Record<string, unknown>, input: TransitionInput<ConfirmData>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.data.confirmed ? 'User confirmed — proceeding with deploy.' : 'User denied — aborting deploy.',
    });
    this.setResult({ confirmed: input.data.confirmed } as unknown as Record<string, unknown>);
  }
}
