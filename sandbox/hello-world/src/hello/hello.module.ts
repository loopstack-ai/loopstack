import { Module } from '@nestjs/common';
import { HelloWorkflow } from './hello.workflow';
import { HelloWorkspace } from './hello.workspace';

@Module({
  providers: [HelloWorkflow, HelloWorkspace],
})
export class HelloModule {}
