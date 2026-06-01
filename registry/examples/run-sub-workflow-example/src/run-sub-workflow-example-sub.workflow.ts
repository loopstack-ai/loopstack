import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface SubWorkflowState {}

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-sub.ui.yaml',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow<Record<string, unknown>, SubWorkflowState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Initial({ to: 'end' })
  async message(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: SubWorkflowState,
  ): Promise<{ message: string }> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'Sub workflow completed.',
    });

    return { message: 'Hi mom!' };
  }
}
