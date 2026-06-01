import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface ToolResultsState {
  storedMessage?: string;
}

@Workflow({
  title: 'Workflow Tool Result',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow<Record<string, unknown>, ToolResultsState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  @Initial({ to: 'data_created' })
  async createSomeData(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: ToolResultsState,
  ): Promise<ToolResultsState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Stored in initial transition: Hello World.`,
    });
    return { ...state, storedMessage: 'Hello World.' };
  }

  @Final({ from: 'data_created' })
  async accessData(ctx: WorkflowContext, state: ToolResultsState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Accessed from previous transition: ${state.storedMessage}`,
    });
    return {};
  }
}
