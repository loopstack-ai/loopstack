import { z } from 'zod';
import { BaseWorkflow, Initial, InjectTool, Output, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Workflow({
  uiConfig: __dirname + '/run-sub-workflow-example-sub.workflow.yaml',
})
export class RunSubWorkflowExampleSubWorkflow extends BaseWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Output({
    schema: z.object({
      message: z.string(),
    }),
  })
  getResult(): any {
    return {
      message: 'Hi mom!',
    };
  }

  @Initial({ to: 'end' })
  async message() {
    await this.createChatMessage.call({
      role: 'assistant',
      content: 'Sub workflow completed.',
    });
  }
}
