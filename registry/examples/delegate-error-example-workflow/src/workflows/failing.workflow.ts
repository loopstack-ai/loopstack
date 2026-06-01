import { BaseWorkflow, Initial, Workflow } from '@loopstack/common';
import type { WorkflowContext } from '@loopstack/common';

/**
 * A minimal sub-workflow that always fails on its initial transition.
 * Used to verify that failed sub-workflow callbacks propagate errors to the parent.
 */
@Workflow({ title: 'Failing Workflow' })
export class FailingWorkflow extends BaseWorkflow {
  @Initial({ to: 'done' })
  async start(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('Simulated sub-workflow failure.'));
  }
}
