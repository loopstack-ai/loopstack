import { WorkflowBase } from '@loopstack/core';
import { BlockConfig, Helper, Tool, WithState } from '@loopstack/common';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { CreateValue } from '@loopstack/core-tools-module';
import { CreateChatMessage } from '@loopstack/core-ui-module';

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
