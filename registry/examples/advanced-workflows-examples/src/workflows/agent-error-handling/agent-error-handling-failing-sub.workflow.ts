import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

/**
 * A minimal sub-workflow that always fails on its initial transition.
 * Used to verify that failed sub-workflow callbacks propagate errors to the parent.
 */
@Workflow({ title: 'Agent Error Handling - Failing Sub-Workflow' })
export class AgentErrorHandlingFailingSubWorkflow extends BaseWorkflow {
  @Transition({ to: 'done' })
  start() {
    return Promise.reject(new Error('Simulated sub-workflow failure.'));
  }
}
