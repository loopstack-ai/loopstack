import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, Helper, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/workflow-state.workflow.yaml',
})
@WithState(
  z.object({
    message: z.string().optional(),
  }),
)
export class WorkflowStateWorkflow extends WorkflowBase {
  @Tool() private createValue: CreateValue;
  @Tool() private createChatMessage: CreateChatMessage;

  @Helper()
  messageInUpperCase(message: string) {
    return message?.toUpperCase();
  }
}
