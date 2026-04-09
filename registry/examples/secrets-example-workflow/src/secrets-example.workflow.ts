import { BaseWorkflow, Final, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import { GetSecretKeysTool, MarkdownDocument, RequestSecretsTool, SecretRequestDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/secrets-example.ui.yaml',
})
export class SecretsExampleWorkflow extends BaseWorkflow {
  @InjectTool() private requestSecrets: RequestSecretsTool;
  @InjectTool() private getSecretKeys: GetSecretKeysTool;

  secretKeys?: Array<{ key: string; hasValue: boolean }>;

  @Initial({ to: 'requesting_secrets' })
  async requestSecretsFromUser() {
    await this.requestSecrets.call({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.repository.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted() {
    const result: ToolResult<Array<{ key: string; hasValue: boolean }>> = await this.getSecretKeys.call({});
    this.secretKeys = result.data;
  }

  @Final({ from: 'verifying' })
  async showResult() {
    await this.repository.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/secretsVerified.md', { secretKeys: this.secretKeys }),
    });
  }
}
