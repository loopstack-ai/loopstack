import { Injectable } from '@nestjs/common';
import { DefineHelper, InjectTool, Workflow, WorkflowMetadataInterface } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

interface WorkflowToolsMetadata {
  create_some_data: {
    say_hello: {
      data: string;
    };
  };
}

@Injectable()
@Workflow({
  configFile: __dirname + '/workflow-tool-results.workflow.yaml',
})
export class WorkflowToolResultsWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  @DefineHelper()
  extractMessage(metadata: WorkflowMetadataInterface): string {
    const tools = metadata.tools as unknown as WorkflowToolsMetadata;
    return tools.create_some_data.say_hello.data;
  }
}
