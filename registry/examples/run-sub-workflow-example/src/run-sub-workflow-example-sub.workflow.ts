import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

@Workflow({
  name: 'run_sub_workflow_example_sub',
  title: 'Sub Workflow',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async message(_state: Record<string, unknown>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Sub workflow completed.',
    });

    this.setResult({ message: 'Hi mom!' } as unknown as Record<string, unknown>);
  }
}
