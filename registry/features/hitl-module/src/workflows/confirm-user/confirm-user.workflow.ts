import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { ConfirmUserDocument } from '../../documents/confirm-user-document.js';

interface ConfirmUserState {
  markdown: string;
}

@Workflow({
  title: 'Confirm User',
  description:
    'Generic sub-workflow that presents markdown content to the user and waits for confirmation.\nUsed by async tool calls (e.g. askForApproval) to get explicit user confirmation.',
  schema: z.object({
    markdown: z.string(),
  }),
})
export class ConfirmUserWorkflow extends BaseWorkflow<{ markdown: string }, ConfirmUserState> {
  @Transition({ to: 'waiting_for_confirmation' })
  async showContent(state: ConfirmUserState, ctx: RunContext): Promise<ConfirmUserState> {
    const args = ctx.args as { markdown: string };
    await this.documentStore.save(ConfirmUserDocument, { markdown: args.markdown }, { id: 'content' });
    return { ...state, markdown: args.markdown };
  }

  @Transition({ from: 'waiting_for_confirmation', to: 'end', wait: true })
  async userConfirmed(state: ConfirmUserState): Promise<{ confirmed: boolean; markdown: string }> {
    return Promise.resolve({ confirmed: true, markdown: state.markdown });
  }

  @Transition({ from: 'waiting_for_confirmation', to: 'end', wait: true })
  async userDenied(state: ConfirmUserState): Promise<{ confirmed: boolean; markdown: string }> {
    return Promise.resolve({ confirmed: false, markdown: state.markdown });
  }
}
