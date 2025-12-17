import { WorkflowBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';
import { BlockConfig, Tool } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/core-ui-module';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/hello-world.workflow.yaml',
})
export class HelloWorldWorkflow extends WorkflowBase {

  @Tool() private createChatMessage: CreateChatMessage

}