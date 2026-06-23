import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { ConfirmUserDocument } from '../../documents/confirm-user-document.js';

interface ConfirmUserState {
  markdown: string;
}

const ConfirmUserArgsSchema = z.object({
  markdown: z.string(),
});

type ConfirmUserArgs = z.infer<typeof ConfirmUserArgsSchema>;

@Workflow({
  name: 'confirm_user',
  title: 'Confirm User',
  description:
    'Generic sub-workflow that presents markdown content to the user and waits for confirmation.\nUsed by async tool calls (e.g. askForApproval) to get explicit user confirmation.',
  schema: ConfirmUserArgsSchema,
})
export class ConfirmUserWorkflow extends BaseWorkflow<ConfirmUserArgs> {
  @Transition({ to: 'waiting_for_confirmation' })
  async showContent(state: ConfirmUserState, ctx: RunContext<ConfirmUserArgs>) {
    await this.documentStore.save(ConfirmUserDocument, { markdown: ctx.args.markdown }, { key: 'content' });
    this.assignState({ markdown: ctx.args.markdown });
  }

  @Transition({ from: 'waiting_for_confirmation', to: 'end', wait: true })
  userConfirmed(state: ConfirmUserState) {
    this.setResult({ confirmed: true, markdown: state.markdown } as unknown as Record<string, unknown>);
  }

  @Transition({ from: 'waiting_for_confirmation', to: 'end', wait: true })
  userDenied(state: ConfirmUserState) {
    this.setResult({ confirmed: false, markdown: state.markdown } as unknown as Record<string, unknown>);
  }
}
