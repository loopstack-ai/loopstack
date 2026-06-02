import { Inject } from '@nestjs/common';
import { z } from 'zod';
import type { LoopstackContext } from '@loopstack/common';
import { BaseWorkflow, DOCUMENT_STORE, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { SecretRequestDocument } from '../documents/index.js';

interface SecretsRequestArgs {
  variables: { key: string }[];
}

interface SecretsRequestState {
  variables: { key: string }[];
}

@Workflow({
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
export class SecretsRequestWorkflow extends BaseWorkflow<SecretsRequestArgs, SecretsRequestState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Transition({ to: 'requesting_secrets' })
  async showForm(state: SecretsRequestState, ctx: LoopstackContext): Promise<SecretsRequestState> {
    const args = ctx.args as SecretsRequestArgs;
    await this.documentStore.save(SecretRequestDocument, {
      variables: args.variables,
    });

    return { ...state, variables: args.variables };
  }

  @Transition({ from: 'requesting_secrets', to: 'end', wait: true })
  async secretsSubmitted(_state: SecretsRequestState): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
}
