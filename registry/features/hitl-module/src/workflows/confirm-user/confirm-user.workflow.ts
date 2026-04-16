import { z } from 'zod';
import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { ConfirmUserDocument } from '../../documents/confirm-user-document';

@Workflow({
  uiConfig: __dirname + '/confirm-user.ui.yaml',
  schema: z.object({
    markdown: z.string(),
  }),
})
export class ConfirmUserWorkflow extends BaseWorkflow {
  markdown?: string;

  @Initial({ to: 'waiting_for_confirmation' })
  async showContent(args: { markdown: string }) {
    this.markdown = args.markdown;
    await this.repository.save(ConfirmUserDocument, { markdown: args.markdown }, { id: 'content' });
  }

  @Final({ from: 'waiting_for_confirmation', wait: true })
  async userConfirmed(): Promise<{ confirmed: boolean; markdown: string }> {
    return Promise.resolve({ confirmed: true, markdown: this.markdown! });
  }

  @Final({ from: 'waiting_for_confirmation', wait: true })
  async userDenied(): Promise<{ confirmed: boolean; markdown: string }> {
    return Promise.resolve({ confirmed: false, markdown: this.markdown! });
  }
}
