import { WorkspaceBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';

@Injectable()
@BlockConfig({
  config: {
    title: "Default Workspace"
  }
})
export class DefaultWorkspace extends WorkspaceBase {

  @Workflow() helloWorld: HelloWorldWorkflow;

  // Add your workflows here

}