import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

interface WorkflowStateState {
  message?: string;
}

@Workflow({
  title: 'Workflow State',
})
export class WorkflowStateWorkflow extends BaseWorkflow<Record<string, unknown>, WorkflowStateState> {
  @Transition({ to: 'data_created' })
  async createSomeData(state: WorkflowStateState): Promise<WorkflowStateState> {
    return { ...state, message: 'Hello :)' };
  }

  @Transition({ from: 'data_created', to: 'end' })
  async showResults(state: WorkflowStateState): Promise<unknown> {
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
