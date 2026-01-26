import { Injectable } from '@nestjs/common';
import { BlockConfig, Helper, Tool } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { WorkflowMetadataInterface } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-metadata.interface';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/workflow-tool-results.workflow.yaml',
})
export class WorkflowToolResultsWorkflow extends WorkflowBase {
  @Tool() private createValue: CreateValue;
  @Tool() private createChatMessage: CreateChatMessage;

  @Helper()
  extractMessage(metadata: WorkflowMetadataInterface): string {
    return metadata.tools.create_some_data.say_hello.data;
  }
}
