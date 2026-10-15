import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { FailureInput } from '@loopstack/common';
import { SubWorkflowFailureChildWorkflow } from './sub-workflow-failure-child.workflow';

/**
 * A child that always throws, and a parent that handles it: the `onFailure` transition records what happened
 * and parks the run at `child_failed`, where a Recover button finishes it. The `onSuccess` body never runs.
 *
 * Declaring no `onFailure` is the other option: the parent is then parked as failed at the place it waits at,
 * with the child's message, and the child keeps its Retry.
 */
@Workflow({
  name: 'sub_workflow_failure_example',
  title: 'Error Handling - Sub-Workflow Failure Example',
  description:
    'A child workflow that always fails, handled by the parent’s onFailure transition. ' +
    'Click "Recover" to finish the run.',
  widget: './sub-workflow-failure-example.ui.yaml',
})
export class SubWorkflowFailureExampleWorkflow extends BaseWorkflow {
  constructor(private readonly child: SubWorkflowFailureChildWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting_child' })
  async startChild() {
    await this.child.run({}, { onSuccess: { transition: 'childCompleted' }, onFailure: { transition: 'childFailed' } });
  }

  @Transition({ from: 'awaiting_child', to: 'end', wait: true })
  async childCompleted() {
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: 'Child workflow completed.' });
    this.setResult({ recovered: false });
  }

  @Transition({ from: 'awaiting_child', to: 'child_failed', wait: true })
  async childFailed(_state: Record<string, unknown>, input: FailureInput) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Child workflow ${input.status}: ${input.errorMessage ?? 'no message'}.`,
    });
  }

  @Transition({ from: 'child_failed', to: 'end', wait: true })
  async recover() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Recovered from the child workflow failure.',
    });
    this.setResult({ recovered: true });
  }
}
