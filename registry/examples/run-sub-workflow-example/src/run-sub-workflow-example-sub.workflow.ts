import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

@Workflow({
  title: 'Sub Workflow',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  async message(_state: Record<string, unknown>): Promise<{ message: string }> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'Sub workflow completed.',
    });

    return { message: 'Hi mom!' };
  }
}
