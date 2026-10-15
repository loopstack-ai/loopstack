import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

/** Child of the sub-workflow failure example: always throws, so its parent's `onFailure` runs. */
@Workflow({
  title: 'Error Handling - Sub-Workflow Failure Child',
})
export class SubWorkflowFailureChildWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  fail() {
    throw new Error('Child workflow failed');
  }
}
