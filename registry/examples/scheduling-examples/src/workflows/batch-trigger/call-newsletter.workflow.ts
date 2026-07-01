import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { localBaseUrl } from '../../support/local-base-url';

const CallNewsletterArgsSchema = z.object({
  recipients: z
    .array(z.string())
    .default(['ada@example.com', 'grace@example.com', 'linus@example.com'])
    .describe('Subscribers to fan out to.'),
});
type CallNewsletterArgs = z.infer<typeof CallNewsletterArgsSchema>;

@Workflow({
  title: 'Scheduling - Trigger Batch (HTTP)',
  description:
    'Runnable from Studio. Makes a real HTTP POST to /webhooks/scheduling-examples/newsletter, which fans out one BatchTriggerWorkflow run per recipient. Demonstrates the batch primitive end-to-end without curl.',
  schema: CallNewsletterArgsSchema,
})
export class CallNewsletterWorkflow extends BaseWorkflow<CallNewsletterArgs> {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  @Transition({ to: 'end' })
  async call(_state: Record<string, unknown>, ctx: RunContext<CallNewsletterArgs>) {
    const url = `${localBaseUrl(this.configService)}/webhooks/scheduling-examples/newsletter`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx.args),
    });
    const data = (await res.json()) as { launched?: number; workflowIds?: string[] };

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `POST ${url} → ${res.status}. Launched ${data.launched ?? 0} newsletter runs.`,
    });
    this.assignResult({ status: res.status, response: data });
  }
}
