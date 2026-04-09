import { z } from 'zod';
import { BaseWorkflow, Initial, InjectTool, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-sub.ui.yaml',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Initial({ to: 'end' })
  async message(): Promise<{ message: string }> {
    await this.createChatMessage.call({
      role: 'assistant',
      content: 'Sub workflow completed.',
    });

    return { message: 'Hi mom!' };
  }
}
