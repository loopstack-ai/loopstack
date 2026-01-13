import { WorkflowBase } from '@loopstack/core';
import { BlockConfig, Helper, Tool, WithState } from '@loopstack/common';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { CreateValue } from '@loopstack/create-value-tool';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

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
