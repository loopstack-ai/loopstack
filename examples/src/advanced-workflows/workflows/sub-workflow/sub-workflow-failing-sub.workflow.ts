import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const FailingSubArgsSchema = z
  .object({
    fail: z.boolean().default(true),
  })
  .strict();

type FailingSubArgs = z.infer<typeof FailingSubArgsSchema>;

/**
 * A sub-workflow that throws unless it is started with `fail: false` — its parent receives a
 * callback with `status: 'failed'` and `hasError: true`, or `status: 'completed'` when it succeeds.
 */
@Workflow({
  name: 'run_sub_workflow_example_failing_sub',
  title: 'Advanced - Failing Sub-Workflow (child)',
  schema: FailingSubArgsSchema,
})
export class RunSubWorkflowExampleFailingSubWorkflow extends BaseWorkflow<FailingSubArgs> {
  @Transition({ to: 'end' })
  async finish(_state: Record<string, unknown>, ctx: RunContext<FailingSubArgs>) {
    if (ctx.args.fail) {
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: 'About to throw — this child fails on purpose.',
      });
      throw new Error('Demo failure: this sub-workflow was started with fail: true.');
    }
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Started with fail: false — completing normally.',
    });
  }
}
