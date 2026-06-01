import { BaseWorkflow, Initial, Workflow } from '@loopstack/common';
import type { WorkflowContext } from '@loopstack/common';

interface FailingState {}

/**
 * A minimal sub-workflow that always fails on its initial transition.
 * Used to verify that failed sub-workflow callbacks propagate errors to the parent.
 */
@Workflow({})
export class FailingWorkflow extends BaseWorkflow<Record<string, unknown>, FailingState> {
  @Initial({ to: 'done' })
  async start(ctx: WorkflowContext, args: Record<string, unknown>, state: FailingState): Promise<FailingState> {
    return Promise.reject(new Error('Simulated sub-workflow failure.'));
  }
}
