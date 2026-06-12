import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

interface ToolResultsState {
  storedMessage?: string;
}

@Workflow({
  title: 'Workflow Tool Result',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow<Record<string, unknown>, ToolResultsState> {
  @Transition({ to: 'data_created' })
  async createSomeData(state: ToolResultsState): Promise<ToolResultsState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Stored in initial transition: Hello World.`,
    });
    return { ...state, storedMessage: 'Hello World.' };
  }

  @Transition({ from: 'data_created', to: 'end' })
  async accessData(state: ToolResultsState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Accessed from previous transition: ${state.storedMessage}`,
    });
    return {};
  }
}
