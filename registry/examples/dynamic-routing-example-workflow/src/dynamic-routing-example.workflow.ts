import { z } from 'zod';
import { InjectTool, Input, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Workflow({
  configFile: __dirname + '/dynamic-routing-example.workflow.yaml',
})
export class DynamicRoutingExampleWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Input({
    schema: z
      .object({
        value: z.number().default(150),
      })
      .strict(),
  })
  args: {
    value: number;
  };
}
