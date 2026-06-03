import { Inject } from '@nestjs/common';
import { BaseWorkflow, MarkdownDocument, TEMPLATE_RENDERER, Transition, Workflow } from '@loopstack/common';
import type { TemplateRenderFn } from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/secrets-module';

interface SecretsExampleState {
  secretKeys?: Array<{ key: string; hasValue: boolean }>;
}

@Workflow({
  title: 'Secrets Update Example',
  description: 'A simple workflow that requests secrets from the user and then verifies they were stored.',
})
export class SecretsExampleWorkflow extends BaseWorkflow<Record<string, unknown>, SecretsExampleState> {
  constructor(
    private readonly requestSecrets: RequestSecretsTool,
    private readonly getSecretKeys: GetSecretKeysTool,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'requesting_secrets' })
  async requestSecretsFromUser(state: SecretsExampleState): Promise<SecretsExampleState> {
    await this.requestSecrets.call({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.documentStore.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
    return state;
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted(state: SecretsExampleState): Promise<SecretsExampleState> {
    const result = await this.getSecretKeys.call();
    return { ...state, secretKeys: result.data };
  }

  @Transition({ from: 'verifying', to: 'end' })
  async showResult(state: SecretsExampleState): Promise<unknown> {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/secretsVerified.md', {
        secretKeys: state.secretKeys,
      }),
    });
    return {};
  }
}
