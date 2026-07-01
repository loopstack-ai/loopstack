import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

interface WorkflowStateState {
  message?: string;
}

@Workflow({
  title: 'Advanced - Workflow State Example',
  description: 'Persisting typed state across transitions with assignState() and reading it in later steps.',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
  @Transition({ to: 'data_created' })
  createSomeData() {
    this.assignState({ message: 'Hello :)' });
  }

  @Transition({ from: 'data_created', to: 'end' })
  async showResults(state: WorkflowStateState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Data from state: ${state.message}`,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Use workflow helper method: ${this.messageInUpperCase(state.message!)}`,
    });
  }

  private messageInUpperCase(message: string): string {
    return message?.toUpperCase();
  }
}
