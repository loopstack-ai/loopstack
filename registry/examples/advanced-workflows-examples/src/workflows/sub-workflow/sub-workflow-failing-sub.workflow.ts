import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

/**
 * A sub-workflow that always throws — useful for exercising the parent-side error UI
 * (red link card, inline error message) and for verifying that callbacks still fire
 * with `status: 'failed'` when a child crashes.
 */
@Workflow({
  name: 'run_sub_workflow_example_failing_sub',
  title: 'Advanced - Failing Sub-Workflow (child)',
})
export class RunSubWorkflowExampleFailingSubWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async fail(_state: Record<string, unknown>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'About to throw — this child always fails on purpose.',
    });
    throw new Error('Demo failure: this sub-workflow is wired to always throw.');
  }
}
