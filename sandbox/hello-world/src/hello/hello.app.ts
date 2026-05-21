import { Injectable } from '@nestjs/common';
import { App, InjectWorkflow } from '@loopstack/common';
import { HelloWorkflow } from './hello.workflow';

@Injectable()
@App({
  uiConfig: {
    title: 'Hello World',
  },
})
export class HelloApp {
  @InjectWorkflow() hello: HelloWorkflow;
}
