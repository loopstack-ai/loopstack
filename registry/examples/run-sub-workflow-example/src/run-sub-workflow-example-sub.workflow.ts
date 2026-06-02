import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';

@Workflow({
  title: 'Sub Workflow',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Transition({ to: 'end' })
  async message(state: Record<string, unknown>): Promise<{ message: string }> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'Sub workflow completed.',
    });

    return { message: 'Hi mom!' };
  }
}
