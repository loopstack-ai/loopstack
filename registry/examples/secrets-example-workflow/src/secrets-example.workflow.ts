import { Inject } from '@nestjs/common';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  Final,
  Initial,
  MarkdownDocument,
  TEMPLATE_RENDERER,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn, WorkflowContext } from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/secrets-module';

interface SecretsExampleState {
  secretKeys?: Array<{ key: string; hasValue: boolean }>;
}

@Workflow({
  title: 'Secrets',
  uiConfig: __dirname + '/secrets-example.ui.yaml',
})
export class SecretsExampleWorkflow extends BaseWorkflow<Record<string, unknown>, SecretsExampleState> {
  constructor(
    private readonly requestSecrets: RequestSecretsTool,
    private readonly getSecretKeys: GetSecretKeysTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Initial({ to: 'requesting_secrets' })
  async requestSecretsFromUser(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: SecretsExampleState,
  ): Promise<SecretsExampleState> {
    await this.requestSecrets.call({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.documentStore.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
    return state;
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted(ctx: WorkflowContext, state: SecretsExampleState): Promise<SecretsExampleState> {
    const result = await this.getSecretKeys.call();
    return { ...state, secretKeys: result.data };
  }

  @Final({ from: 'verifying' })
  async showResult(ctx: WorkflowContext, state: SecretsExampleState): Promise<unknown> {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/secretsVerified.md', {
        secretKeys: state.secretKeys,
      }),
    });
    return {};
  }
}
