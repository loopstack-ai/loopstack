import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

interface ToolResultsState {
  storedMessage?: string;
}

@Workflow({
  title: 'Advanced - Workflow Tool Result Example',
  description: 'Storing tool results in workflow state and accessing them in later transitions.',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  @Transition({ to: 'data_created' })
  async createSomeData(_state: ToolResultsState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Stored in initial transition: Hello World.`,
    });
    this.assignState({ storedMessage: 'Hello World.' });
  }

  @Transition({ from: 'data_created', to: 'end' })
  async accessData(state: ToolResultsState) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Accessed from previous transition: ${state.storedMessage}`,
    });
  }
}
