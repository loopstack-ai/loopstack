import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface WorkflowStateState {
  message?: string;
}

@Workflow({
  title: 'Workflow State',
  uiConfig: __dirname + '/workflow-state.ui.yaml',
})
export class WorkflowStateWorkflow extends BaseWorkflow<Record<string, unknown>, WorkflowStateState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Initial({ to: 'data_created' })
  async createSomeData(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: WorkflowStateState,
  ): Promise<WorkflowStateState> {
    return { ...state, message: 'Hello :)' };
  }

  @Final({ from: 'data_created' })
  async showResults(ctx: WorkflowContext, state: WorkflowStateState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Data from state: ${state.message}`,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Use workflow helper method: ${this.messageInUpperCase(state.message!)}`,
    });
    return {};
  }

  private messageInUpperCase(message: string): string {
    return message?.toUpperCase();
  }
}
