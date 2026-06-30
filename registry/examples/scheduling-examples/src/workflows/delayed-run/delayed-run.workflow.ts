import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const DelayedRunArgsSchema = z.object({
  email: z.string().default('new.user@example.com').describe('User to follow up with.'),
});
type DelayedRunArgs = z.infer<typeof DelayedRunArgsSchema>;

@Workflow({
  title: 'Scheduling - Delayed Run (Signup Follow-up) Example',
  description:
    'The workflow a delayed job runs. Scheduled by DelayedRunController on POST /webhooks/scheduling-examples/signup to fire after a delay; also runnable from Studio with a sample user.',
  schema: DelayedRunArgsSchema,
})
export class DelayedRunWorkflow extends BaseWorkflow<DelayedRunArgs> {
  @Transition({ to: 'end' })
  async sendFollowup(_state: Record<string, unknown>, ctx: RunContext<DelayedRunArgs>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Follow-up for ${ctx.args.email}: how is onboarding going? Reply if you need a hand getting started.`,
    });
    this.assignResult({ email: ctx.args.email });
  }
}
