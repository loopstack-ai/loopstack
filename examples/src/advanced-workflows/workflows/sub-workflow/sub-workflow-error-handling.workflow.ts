import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { RunSubWorkflowExampleFailingSubWorkflow } from './sub-workflow-failing-sub.workflow';

const ErrorHandlingArgsSchema = z
  .object({
    fail: z.boolean().default(true),
  })
  .strict();

type ErrorHandlingArgs = z.infer<typeof ErrorHandlingArgsSchema>;

/**
 * Reads a child's outcome from the callback envelope. The parent starts a child that fails
 * unless `fail: false` is passed, and its callback branches on `input.hasError`, reporting
 * `input.status` and `input.errorMessage` — no try/catch, and no need to query the child
 * entity separately.
 */
@Workflow({
  title: 'Advanced - Sub-Workflow Error Handling Example',
  description:
    'Demonstrates handling failed child workflows via input.hasError and input.errorMessage on the callback envelope.',
  schema: ErrorHandlingArgsSchema,
})
export class RunSubWorkflowExampleErrorHandlingWorkflow extends BaseWorkflow<ErrorHandlingArgs> {
  constructor(private readonly failingSub: RunSubWorkflowExampleFailingSubWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async launch(_state: Record<string, unknown>, ctx: RunContext<ErrorHandlingArgs>) {
    await this.failingSub.run(
      { fail: ctx.args.fail },
      { callback: { transition: 'onChildFinished' }, show: 'link', label: 'Sub-workflow that may fail' },
    );
  }

  @Transition({
    from: 'awaiting',
    to: 'end',
    wait: true,
  })
  async onChildFinished(_state: Record<string, unknown>, input: TransitionInput) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.hasError
        ? `Child failed (status="${input.status}"): ${input.errorMessage ?? 'unknown error'}. The parent recovered gracefully.`
        : `Child finished normally (status="${input.status}").`,
    });
    this.setResult({ childStatus: input.status, childErrorMessage: input.errorMessage } as unknown as Record<
      string,
      unknown
    >);
  }
}
