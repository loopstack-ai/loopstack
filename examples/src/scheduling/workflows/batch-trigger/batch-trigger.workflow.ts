import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const BatchTriggerArgsSchema = z.object({
  recipient: z.string().default('subscriber@example.com').describe('Single newsletter recipient.'),
});
type BatchTriggerArgs = z.infer<typeof BatchTriggerArgsSchema>;

@Workflow({
  title: 'Scheduling - Batch (Newsletter) Example',
  description:
    'One unit of batch work: send the newsletter to a single recipient. BatchTriggerController fans this out over a list with Promise.all; also runnable from Studio for a single recipient.',
  schema: BatchTriggerArgsSchema,
})
export class BatchTriggerWorkflow extends BaseWorkflow<BatchTriggerArgs> {
  @Transition({ to: 'end' })
  async sendNewsletter(_state: Record<string, unknown>, ctx: RunContext<BatchTriggerArgs>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Newsletter sent to ${ctx.args.recipient}.`,
    });
    this.assignResult({ recipient: ctx.args.recipient });
  }
}
