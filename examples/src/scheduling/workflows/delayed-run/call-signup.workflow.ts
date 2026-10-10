import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { localBaseUrl } from '../../support/local-base-url';

const CallSignupArgsSchema = z.object({
  email: z.string().default('grace@example.com'),
});
type CallSignupArgs = z.infer<typeof CallSignupArgsSchema>;

@Workflow({
  title: 'Scheduling - Trigger Delayed Run (HTTP)',
  description:
    'Runnable from Studio. Makes a real HTTP POST to /webhooks/scheduling-examples/signup, which schedules DelayedRunWorkflow to fire after a delay. Demonstrates the delayed-run primitive end-to-end without curl.',
  schema: CallSignupArgsSchema,
})
export class CallSignupWorkflow extends BaseWorkflow<CallSignupArgs> {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  @Transition({ to: 'end' })
  async call(_state: Record<string, unknown>, ctx: RunContext<CallSignupArgs>) {
    const url = `${localBaseUrl(this.configService)}/webhooks/scheduling-examples/signup`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx.args),
    });
    const data = (await res.json()) as { followupInMs?: number };

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `POST ${url} → ${res.status}. Follow-up for ${ctx.args.email} scheduled in ${data.followupInMs ?? '?'}ms — watch for it to post.`,
    });
    this.assignResult({ status: res.status, response: data });
  }
}
