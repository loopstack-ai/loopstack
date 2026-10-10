import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { SubWorkflowErrorPlaceChildWorkflow } from './sub-workflow-error-place-child.workflow';

/**
 * Sub-workflow failure routed via errorPlace: the callback transition declares
 * `errorPlace: 'child_failed'`, so a failed child moves the parent to a recovery place instead of
 * running the happy-path body with no result. The Recover button continues the run.
 */
@Workflow({
  title: 'Error Handling - Sub-Workflow Error Place Example',
  description:
    'Sub-workflow failure callback routed via errorPlace: the child always fails and the parent ' +
    'moves to a recovery place. Click "Recover" to run the recovery transition.',
  widget: './sub-workflow-error-place-example.ui.yaml',
})
export class SubWorkflowErrorPlaceExampleWorkflow extends BaseWorkflow {
  constructor(private readonly child: SubWorkflowErrorPlaceChildWorkflow) {
    super();
  }

  @Transition({ to: 'awaiting_child' })
  async startChild() {
    await this.child.run({}, { callback: { transition: 'childCompleted' } });
  }

  // Runs only when the child completes — a failed child is routed to `child_failed` instead.
  @Transition({ from: 'awaiting_child', to: 'end', wait: true, errorPlace: 'child_failed' })
  async childCompleted() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Child workflow completed.',
    });
    this.setResult({ recovered: false });
  }

  @Transition({ from: 'child_failed', to: 'end', wait: true })
  async recover() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Recovered from the child workflow failure via the error place.',
    });
    this.setResult({ recovered: true });
  }
}
