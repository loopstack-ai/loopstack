import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/secrets-module';

interface SecretsExampleState {
  secretKeys?: Array<{ key: string; hasValue: boolean }>;
}

@Workflow({
  title: 'Secrets Update Example',
  description: 'A simple workflow that requests secrets from the user and then verifies they were stored.',
})
export class SecretsExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly requestSecrets: RequestSecretsTool,
    private readonly getSecretKeys: GetSecretKeysTool,
  ) {
    super();
  }

  @Transition({ to: 'requesting_secrets' })
  async requestSecretsFromUser(_state: SecretsExampleState) {
    await this.requestSecrets.call({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.documentStore.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted(_state: SecretsExampleState) {
    const result = await this.getSecretKeys.call();
    this.assignState({ secretKeys: result.data });
  }

  @Transition({ from: 'verifying', to: 'end' })
  async showResult(state: SecretsExampleState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/secretsVerified.md', {
        secretKeys: state.secretKeys,
      }),
    });
  }
}
