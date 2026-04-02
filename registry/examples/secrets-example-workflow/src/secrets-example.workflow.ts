import {
  Final,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  ToolResult,
  Transition,
  Workflow,
  WorkflowTemplates,
} from '@loopstack/common';
import { GetSecretKeysTool, MarkdownDocument, RequestSecretsTool, SecretRequestDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/secrets-example.workflow.yaml',
  templates: {
    secretsVerified: __dirname + '/templates/secretsVerified.md',
  },
})
export class SecretsExampleWorkflow {
  @InjectTool() private requestSecrets: RequestSecretsTool;
  @InjectTool() private getSecretKeys: GetSecretKeysTool;
  @InjectDocument() private secretRequestDocument: SecretRequestDocument;
  @InjectDocument() private markdownDocument: MarkdownDocument;
  @InjectTemplates() templates: WorkflowTemplates;

  secretKeys?: Array<{ key: string; hasValue: boolean }>;

  @Initial({ to: 'requesting_secrets' })
  async requestSecretsFromUser() {
    await this.requestSecrets.run({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.secretRequestDocument.create({
      content: {
        variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
      },
    });
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted() {
    const result: ToolResult<Array<{ key: string; hasValue: boolean }>> = await this.getSecretKeys.run(undefined);
    this.secretKeys = result.data;
  }

  @Final({ from: 'verifying' })
  async showResult() {
    await this.markdownDocument.create({
      content: {
        markdown: this.templates.render('secretsVerified', { secretKeys: this.secretKeys }),
      },
    });
  }
}
