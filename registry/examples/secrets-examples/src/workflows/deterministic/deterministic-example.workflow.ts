import { join } from 'node:path';
import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/secrets-module';

interface DeterministicState {
  secretKeys?: Array<{ key: string; hasValue: boolean }>;
}

@Workflow({
  title: 'Secrets - Deterministic Example',
  description:
    'A scripted workflow that requests two secrets from the user, waits for them to be stored, then verifies the result. No LLM involved.',
})
export class DeterministicExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly requestSecrets: RequestSecretsTool,
    private readonly getSecretKeys: GetSecretKeysTool,
  ) {
    super();
  }

  @Transition({ to: 'requesting_secrets' })
  async requestSecretsFromUser() {
    await this.requestSecrets.call({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.documentStore.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted() {
    const result = await this.getSecretKeys.call();
    this.assignState({ secretKeys: result.data });
  }

  @Transition({ from: 'verifying', to: 'end' })
  async showResult(state: DeterministicState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(join(__dirname, 'templates', 'secretsVerified.md'), {
        secretKeys: state.secretKeys,
      }),
    });
  }
}
