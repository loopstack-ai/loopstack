import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DefineHelper, InjectTool, Runtime, RuntimeToolResult, State, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/workflow-state.workflow.yaml',
})
export class WorkflowStateWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Runtime()
  runtime: {
    tools: RuntimeToolResult;
  };

  @State({
    schema: z.object({
      message: z.string().optional(),
    }),
  })
  state: { message: string };

  @DefineHelper()
  messageInUpperCase(message: string) {
    return message?.toUpperCase();
  }
}
