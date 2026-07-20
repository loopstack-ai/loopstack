import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { FailingWorkflow } from './failing.workflow';
import { HelloWorkflow } from './hello.workflow';

@StudioApp({
  title: 'Hello World App',
  workflows: [HelloWorkflow, FailingWorkflow],
})
@Module({
  imports: [
    ClaudeModule,
    LlmProviderModule.forFeature({ model: 'claude-sonnet-4-5' }),
  ],
  providers: [HelloWorkflow, FailingWorkflow],
})
export class HelloModule {}
