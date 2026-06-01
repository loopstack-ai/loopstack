import { Inject } from '@nestjs/common';
import { z } from 'zod';
import type { WorkflowContext } from '@loopstack/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, Workflow } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { SecretRequestDocument } from '../documents/index.js';

interface SecretsRequestArgs {
  variables: { key: string }[];
}

interface SecretsRequestState {
  variables: { key: string }[];
}

@Workflow({
  uiConfig: import.meta.dirname + '/secrets-request.ui.yaml',
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

  @Initial({ to: 'requesting_secrets' })
  async showForm(
    _ctx: WorkflowContext,
    args: SecretsRequestArgs,
    state: SecretsRequestState,
  ): Promise<SecretsRequestState> {
    await this.documentStore.save(SecretRequestDocument, {
      variables: args.variables,
    });

    return { ...state, variables: args.variables };
  }

  @Final({ from: 'requesting_secrets', wait: true })
  async secretsSubmitted(_ctx: WorkflowContext, _state: SecretsRequestState): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
}
