import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { HelloWorkflow } from './hello.workflow';

@StudioApp({
  title: 'My First App',
  workflows: [HelloWorkflow],
})
@Module({
  providers: [HelloWorkflow],
})
export class HelloModule {}
