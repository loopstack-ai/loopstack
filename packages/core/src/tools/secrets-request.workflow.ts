import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, Output, Workflow } from '@loopstack/common';
import { SecretRequestDocument } from '../documents';

@Injectable()
@Workflow({
  uiConfig: __dirname + '/secrets-request.workflow.yaml',
  schema: z.object({
    variables: z.array(
      z.object({
        key: z.string(),
      }),
    ),
  }),
})
export class SecretsRequestWorkflow extends BaseWorkflow<{ variables: { key: string }[] }> {
  submitted?: boolean;

  @Initial({ to: 'requesting_secrets' })
  async showForm() {
    const args = this.ctx.args as { variables: { key: string }[] };
    await this.repository.save(SecretRequestDocument, {
      variables: args.variables,
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
