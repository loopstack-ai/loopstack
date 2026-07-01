import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { SCHEDULING_EXAMPLES_APP } from '../../scheduling-examples.constants';
import { RunUserResolver } from '../../support/run-user.resolver';
import { WebhookTriggerArgsSchema, WebhookTriggerWorkflow } from './webhook-trigger.workflow';

interface PaymentWebhookBody {
  customerEmail?: string;
  amountCents?: number;
  currency?: string;
}

/** Webhook primitive: @Public POST that runs WebhookTriggerWorkflow. Real apps verify a provider signature first. */
@Controller('webhooks/scheduling-examples')
export class WebhookTriggerController {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly runUser: RunUserResolver,
  ) {}

  @Public()
  @Post('payment')
  async onPayment(@Body() body: PaymentWebhookBody) {
    const userId = await this.runUser.resolve();
    if (!userId) {
      return { ok: false, reason: 'No local user yet — open Studio once.' };
    }

    const args = WebhookTriggerArgsSchema.parse(body ?? {});
    const { workflowId } = await this.workflowRunner.run(WebhookTriggerWorkflow, args, {
      appName: SCHEDULING_EXAMPLES_APP,
      userId,
    });
    return { ok: true, workflowId };
  }
}
