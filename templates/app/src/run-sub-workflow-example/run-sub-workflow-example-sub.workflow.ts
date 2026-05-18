import { BaseWorkflow, Initial, MessageDocument, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-sub.ui.yaml',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @Initial({ to: 'end' })
  async message(): Promise<{ message: string }> {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Sub workflow completed.',
    });

    return { message: 'Hi mom!' };
  }
}
