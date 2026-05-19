import { Injectable } from '@nestjs/common';
import { InjectWorkflow, Workspace } from '@loopstack/common';
import { HelloWorkflow } from './hello.workflow';

@Injectable()
@Workspace({
  uiConfig: {
    title: 'Hello World',
  },
})
export class HelloWorkspace {
  @InjectWorkflow() hello: HelloWorkflow;
}
