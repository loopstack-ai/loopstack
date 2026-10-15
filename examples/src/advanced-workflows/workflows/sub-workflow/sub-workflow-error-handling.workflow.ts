import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { FailureInput, RunContext, TransitionInput } from '@loopstack/common';
import { RunSubWorkflowExampleFailingSubWorkflow } from './sub-workflow-failing-sub.workflow';

const ErrorHandlingArgsSchema = z
  .object({
    fail: z.boolean().default(true),
  })
  .strict();

type ErrorHandlingArgs = z.infer<typeof ErrorHandlingArgsSchema>;

/**
 * Names one transition per outcome: `onSuccess` receives the child's result, `onFailure` receives its error.
 * The child fails unless `fail: false` is passed, so both paths are reachable from the launch form.
 *
 * Each handler has a body, so a failure can be reported, retried, cleaned up after, or turned into a decision.
 * A parent that declares no `onFailure` is parked as failed where it waits instead.
 */
@Workflow({
  title: 'Advanced - Sub-Workflow Error Handling Example',
  description: 'Handling a child workflow per outcome: onSuccess receives the result, onFailure the error.',
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
      {
        onSuccess: { transition: 'childSucceeded' },
        onFailure: { transition: 'childFailed' },
        show: 'link',
        label: 'Sub-workflow that may fail',
      },
    );
  }

  @Transition({ from: 'awaiting', to: 'end', wait: true })
  async childSucceeded(_state: Record<string, unknown>, input: TransitionInput) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Child ${input.workflowId} completed.`,
    });
    this.setResult({ childFailed: false });
  }

  @Transition({ from: 'awaiting', to: 'end', wait: true })
  async childFailed(_state: Record<string, unknown>, input: FailureInput) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Child ${input.status}: ${input.errorMessage ?? 'no message'}. The parent recovered gracefully.`,
    });
    this.setResult({ childFailed: true, childStatus: input.status, childErrorMessage: input.errorMessage });
  }
}
