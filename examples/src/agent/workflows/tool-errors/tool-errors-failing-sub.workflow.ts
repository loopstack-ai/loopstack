import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

/**
 * A minimal sub-workflow that always fails on its initial transition.
 * Launched by `failing_sub_workflow`, so the agent receives a failed sub-workflow callback.
 */
@Workflow({ title: 'Agent - Tool Errors Failing Sub-Workflow' })
export class ToolErrorsFailingSubWorkflow extends BaseWorkflow {
  @Transition({ to: 'done' })
  start() {
    return Promise.reject(new Error('Simulated sub-workflow failure.'));
  }
}
