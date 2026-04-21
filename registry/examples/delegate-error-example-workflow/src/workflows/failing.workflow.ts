import { BaseWorkflow, Initial, Workflow } from '@loopstack/common';

/**
 * A minimal sub-workflow that always fails on its initial transition.
 * Used to verify that failed sub-workflow callbacks propagate errors to the parent.
 */
@Workflow({})
export class FailingWorkflow extends BaseWorkflow {
  @Initial({ to: 'done' })
  start(): Promise<unknown> {
    return Promise.reject(new Error('Simulated sub-workflow failure.'));
  }
}
