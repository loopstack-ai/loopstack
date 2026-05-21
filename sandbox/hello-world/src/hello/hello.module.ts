import { Module } from '@nestjs/common';
import { HelloWorkflow } from './hello.workflow';
import { HelloApp } from './hello.app';

@Module({
  providers: [HelloWorkflow, HelloApp],
})
export class HelloModule {}
