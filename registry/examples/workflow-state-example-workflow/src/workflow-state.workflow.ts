import { BaseWorkflow, Final, Initial, Workflow } from '@loopstack/common';
import { MessageDocument } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/workflow-state.ui.yaml',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
  message?: string;

  @Initial({ to: 'data_created' })
  createSomeData() {
    this.message = 'Hello :)';
  }

  @Final({ from: 'data_created' })
  async showResults() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Data from state: ${this.message}`,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Use workflow helper method: ${this.messageInUpperCase(this.message!)}`,
    });
  }

  private messageInUpperCase(message: string): string {
    return message?.toUpperCase();
  }
}
