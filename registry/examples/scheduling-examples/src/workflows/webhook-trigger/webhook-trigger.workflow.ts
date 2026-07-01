import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export const WebhookTriggerArgsSchema = z.object({
  customerEmail: z.string().default('ada@example.com').describe('Who paid.'),
  amountCents: z.number().default(9900).describe('Amount in minor units.'),
  currency: z.string().default('EUR').describe('ISO currency code.'),
});
type WebhookTriggerArgs = z.infer<typeof WebhookTriggerArgsSchema>;

@Workflow({
  title: 'Scheduling - Webhook (Payment Receipt) Example',
  description:
    'The workflow an inbound payment webhook launches. Fired by WebhookTriggerController on POST /webhooks/scheduling-examples/payment; also runnable from Studio with a sample payment.',
  schema: WebhookTriggerArgsSchema,
})
export class WebhookTriggerWorkflow extends BaseWorkflow<WebhookTriggerArgs> {
  @Transition({ to: 'end' })
  async recordReceipt(_state: Record<string, unknown>, ctx: RunContext<WebhookTriggerArgs>) {
    const amount = (ctx.args.amountCents / 100).toFixed(2);
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Payment received: ${amount} ${ctx.args.currency} from ${ctx.args.customerEmail}. Receipt recorded.`,
    });
    this.assignResult({ customerEmail: ctx.args.customerEmail, amount, currency: ctx.args.currency });
  }
}
