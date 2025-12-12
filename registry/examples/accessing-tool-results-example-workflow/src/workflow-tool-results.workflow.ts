import { WorkflowBase } from '@loopstack/core';
import { BlockConfig, Helper, Tool } from '@loopstack/common';
import { Injectable } from '@nestjs/common';
import { WorkflowMetadataInterface } from '@loopstack/core/dist/workflow-processor/interfaces/workflow-metadata.interface';
import { CreateValue } from '@loopstack/core-tools-module';
import { CreateChatMessage } from '@loopstack/core-ui-module';

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
