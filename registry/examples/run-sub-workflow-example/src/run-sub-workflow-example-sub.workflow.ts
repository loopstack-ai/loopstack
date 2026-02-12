import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { InjectTool, Output, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/run-sub-workflow-example-sub.workflow.yaml',
})
export class RunSubWorkflowExampleSubWorkflow {
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
}
