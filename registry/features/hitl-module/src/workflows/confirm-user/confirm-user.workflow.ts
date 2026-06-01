import { Inject } from '@nestjs/common';
import { z } from 'zod';
import type { WorkflowContext } from '@loopstack/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, Workflow } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { ConfirmUserDocument } from '../../documents/confirm-user-document.js';

interface ConfirmUserState {
  markdown: string;
}

@Workflow({
  uiConfig: import.meta.dirname + '/confirm-user.ui.yaml',
  schema: z.object({
    markdown: z.string(),
  }),
})
export class ConfirmUserWorkflow extends BaseWorkflow<{ markdown: string }, ConfirmUserState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Initial({ to: 'waiting_for_confirmation' })
  async showContent(
    _ctx: WorkflowContext,
    args: { markdown: string },
    state: ConfirmUserState,
  ): Promise<ConfirmUserState> {
    await this.documentStore.save(ConfirmUserDocument, { markdown: args.markdown }, { id: 'content' });
    return { ...state, markdown: args.markdown };
  }

  @Final({ from: 'waiting_for_confirmation', wait: true })
  async userConfirmed(
    _ctx: WorkflowContext,
    state: ConfirmUserState,
  ): Promise<{ confirmed: boolean; markdown: string }> {
    return Promise.resolve({ confirmed: true, markdown: state.markdown });
  }

  @Final({ from: 'waiting_for_confirmation', wait: true })
  async userDenied(_ctx: WorkflowContext, state: ConfirmUserState): Promise<{ confirmed: boolean; markdown: string }> {
    return Promise.resolve({ confirmed: false, markdown: state.markdown });
  }
}
