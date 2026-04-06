import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Workflow({
  uiConfig: __dirname + '/workflow-state.workflow.yaml',
})
export class WorkflowStateWorkflow extends BaseWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  message?: string;

  @Initial({ to: 'data_created' })
  async createSomeData() {
    const result = await this.createValue.call({ input: 'Hello :)' });
    this.message = result.data as string;
  }

  @Final({ from: 'data_created' })
  async showResults() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: `Data from state: ${this.message}`,
    });

    await this.createChatMessage.call({
      role: 'assistant',
      content: `Use workflow helper method: ${this.messageInUpperCase(this.message!)}`,
    });
  }

  private messageInUpperCase(message: string): string {
    return message?.toUpperCase();
  }
}
