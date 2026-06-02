import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

/**
 * A minimal sub-workflow that always fails on its initial transition.
 * Used to verify that failed sub-workflow callbacks propagate errors to the parent.
 */
@Workflow({ title: 'Failing Workflow' })
export class FailingWorkflow extends BaseWorkflow {
  @Transition({ to: 'done' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('Simulated sub-workflow failure.'));
  }
}
