import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Final, Initial, InjectDocument, Input, Output, Workflow, WorkflowInterface } from '@loopstack/common';
import { SecretRequestDocument } from '../documents';

@Injectable()
@Workflow({
  uiConfig: __dirname + '/secrets-request.workflow.yaml',
})
export class SecretsRequestWorkflow implements WorkflowInterface {
  @InjectDocument() secretRequestDocument: SecretRequestDocument;

  @Input({
    schema: z.object({
      variables: z.array(
        z.object({
          key: z.string(),
        }),
      ),
    }),
  })
  args: {
    variables: { key: string }[];
  };

  submitted?: boolean;

  @Initial({ to: 'requesting_secrets' })
  async showForm() {
    await this.secretRequestDocument.create({
      content: {
        variables: this.args.variables,
      },
    });
  }

  @Final({ from: 'requesting_secrets', wait: true })
  secretsSubmitted() {
    this.submitted = true;
  }

  @Output({
    schema: z.object({
      success: z.boolean(),
    }),
  })
  getResult() {
    return { success: this.submitted ?? false };
  }
}
