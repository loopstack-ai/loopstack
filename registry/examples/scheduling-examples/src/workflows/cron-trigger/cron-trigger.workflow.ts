import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const CronTriggerArgsSchema = z
  .object({
    message: z.string().default('hello world').describe('The text to post.'),
  })
  .strict();
type CronTriggerArgs = z.infer<typeof CronTriggerArgsSchema>;

@Workflow({
  title: 'Scheduling - Cron Example',
  description:
    'Posts a message. Fired on a schedule by a @Cron service (every few seconds); also runnable manually with a default message of "hello world".',
  schema: CronTriggerArgsSchema,
})
export class CronTriggerWorkflow extends BaseWorkflow<CronTriggerArgs> {
  @Transition({ to: 'end' })
  async post(_state: Record<string, unknown>, ctx: RunContext<CronTriggerArgs>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: ctx.args.message,
    });
    this.assignResult({ message: ctx.args.message });
  }
}
