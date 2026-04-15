import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { MessageDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.ui.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  storedMessage?: string;

  @Initial({ to: 'data_created' })
  async createSomeData() {
    this.storedMessage = 'Hello World.';

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Stored in initial transition: ${this.storedMessage}`,
    });
  }

  @Final({ from: 'data_created' })
  async accessData() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Accessed from previous transition: ${this.storedMessage}`,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Accessed via helper method: ${this.theMessage()}`,
    });
  }

  private theMessage(): string {
    return this.storedMessage!;
  }
}
