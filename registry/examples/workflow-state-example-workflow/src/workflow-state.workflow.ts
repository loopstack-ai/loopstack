import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DefineHelper, InjectTool, WithState, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/workflow-state.workflow.yaml',
})
@WithState(
  z.object({
    message: z.string().optional(),
  }),
)
export class WorkflowStateWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  @DefineHelper()
  messageInUpperCase(message: string) {
    return message?.toUpperCase();
  }
}
