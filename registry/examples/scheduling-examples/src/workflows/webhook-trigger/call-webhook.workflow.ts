import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { localBaseUrl } from '../../support/local-base-url';

const CallWebhookArgsSchema = z.object({
  customerEmail: z.string().default('grace@example.com'),
  amountCents: z.number().default(4200),
  currency: z.string().default('USD'),
});
type CallWebhookArgs = z.infer<typeof CallWebhookArgsSchema>;

@Workflow({
  title: 'Scheduling - Trigger Webhook (HTTP)',
  description:
    'Runnable from Studio. Makes a real HTTP POST to /webhooks/scheduling-examples/payment — the same call an external service would make — which fires WebhookTriggerWorkflow. Demonstrates the webhook primitive end-to-end without curl.',
  schema: CallWebhookArgsSchema,
})
export class CallWebhookWorkflow extends BaseWorkflow<CallWebhookArgs> {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  @Transition({ to: 'end' })
  async call(_state: Record<string, unknown>, ctx: RunContext<CallWebhookArgs>) {
    const url = `${localBaseUrl(this.configService)}/webhooks/scheduling-examples/payment`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx.args),
    });
    const data = (await res.json()) as { workflowId?: string };

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `POST ${url} → ${res.status}. Triggered WebhookTriggerWorkflow ${data.workflowId ?? '(see response)'}.`,
    });
    this.assignResult({ status: res.status, response: data });
  }
}
