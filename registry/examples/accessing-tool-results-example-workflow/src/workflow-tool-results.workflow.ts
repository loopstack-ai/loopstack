import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Workflow({
  uiConfig: __dirname + '/workflow-tool-results.workflow.yaml',
})
export class WorkflowToolResultsWorkflow extends BaseWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  storedMessage?: string;

  @Initial({ to: 'data_created' })
  async createSomeData() {
    const result = await this.createValue.call({ input: 'Hello World.' });
    this.storedMessage = result.data as string;

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from specific call id: ${this.storedMessage}`,
    });

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from first tool call: ${this.storedMessage}`,
    });
  }

  @Final({ from: 'data_created' })
  async accessData() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from previous transition: ${this.storedMessage}`,
    });

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data access using custom helper: ${this.theMessage()}`,
    });
  }

  private theMessage(): string {
    return this.storedMessage!;
  }
}
