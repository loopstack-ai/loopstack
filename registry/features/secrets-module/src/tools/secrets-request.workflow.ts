import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { SecretRequestDocument } from '../documents/index.js';

interface SecretsRequestArgs {
  variables: { key: string }[];
}

interface SecretsRequestState {
  variables: { key: string }[];
}

@Workflow({
  name: 'secrets_request',
  title: 'Secrets Request',
  description:
    'Sub-workflow that presents a secrets request form to the user\nand waits for submission. Completes when the user submits the form.',
  schema: z.object({
    variables: z.array(
      z.object({
        key: z.string(),
      }),
    ),
  }),
})
export class SecretsRequestWorkflow extends BaseWorkflow<SecretsRequestArgs> {
  @Transition({ to: 'requesting_secrets' })
  async showForm(state: SecretsRequestState, ctx: RunContext<SecretsRequestArgs>): Promise<SecretsRequestState> {
    await this.documentStore.save(SecretRequestDocument, {
      variables: ctx.args.variables,
    });

    return { ...state, variables: ctx.args.variables };
  }

  @Transition({ from: 'requesting_secrets', to: 'end', wait: true })
  async secretsSubmitted(_state: SecretsRequestState): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
}
