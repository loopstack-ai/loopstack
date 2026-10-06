import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

/**
 * Child of the sub-workflow error place example — always throws, so its parent receives a
 * `failed` callback.
 */
@Workflow({
  title: 'Error Handling - Sub-Workflow Error Place Child',
})
export class SubWorkflowErrorPlaceChildWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  fail() {
    throw new Error('Child workflow failed');
  }
}
