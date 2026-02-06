import { Injectable } from '@nestjs/common';
import { InjectTool, Workflow, WorkflowInterface } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/hello-world.workflow.yaml',
})
export class HelloWorldWorkflow implements WorkflowInterface {
  @InjectTool() private createChatMessage: CreateChatMessage;
}
