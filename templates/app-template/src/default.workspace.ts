import { Injectable } from '@nestjs/common';
import { InjectWorkflow, Workspace, WorkspaceInterface } from '@loopstack/common';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';

@Injectable()
@Workspace({
  config: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace implements WorkspaceInterface {
  @InjectWorkflow() helloWorld: HelloWorldWorkflow;
}
