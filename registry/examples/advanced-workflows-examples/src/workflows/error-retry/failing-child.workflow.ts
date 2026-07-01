import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

/**
 * Always-failing child used by the error-retry example to exercise the parent-side
 * `errorPlace` routing for sub-workflow callback failures.
 */
@Workflow({
  name: 'error_retry_failing_child',
  title: 'Advanced - Error Retry Failing Child',
})
export class ErrorRetryFailingChildWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async fail() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Failing child: about to throw.',
    });
    throw new Error('Demo failure: this child is wired to always throw.');
  }
}
