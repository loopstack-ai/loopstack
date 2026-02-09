import { Injectable } from '@nestjs/common';
import { DefineHelper, InjectTool, Runtime, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { CreateValue } from '@loopstack/create-value-tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/workflow-tool-results.workflow.yaml',
})
export class WorkflowToolResultsWorkflow {
  @InjectTool() private createValue: CreateValue;
  @InjectTool() private createChatMessage: CreateChatMessage;

  @Runtime()
  runtime: {
    tools: {
      create_some_data: {
        say_hello: {
          data: string;
        };
      };
    };
  };

  @DefineHelper()
  theMessage(): string {
    return this.runtime.tools.create_some_data.say_hello.data;
  }
}
