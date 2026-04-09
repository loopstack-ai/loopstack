import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { SecretRequestDocument } from '../documents';

@Injectable()
@Workflow({
  uiConfig: __dirname + '/secrets-request.ui.yaml',
  schema: z.object({
    variables: z.array(
      z.object({
        key: z.string(),
      }),
    ),
  }),
})
export class SecretsRequestWorkflow extends BaseWorkflow<{ variables: { key: string }[] }> {
  @Initial({ to: 'requesting_secrets' })
  async showForm(args: { variables: { key: string }[] }) {
    await this.repository.save(SecretRequestDocument, {
      variables: args.variables,
    });
  }

  @Final({ from: 'requesting_secrets', wait: true })
  secretsSubmitted(): { success: boolean } {
    return { success: true };
  }
}
