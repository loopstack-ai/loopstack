import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DefineHelper, InjectTool, Input, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Injectable()
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

  @DefineHelper()
  gt(a: number, b: number) {
    return a > b;
  }
}
