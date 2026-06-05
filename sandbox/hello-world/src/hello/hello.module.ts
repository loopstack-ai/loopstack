import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { HelloWorkflow } from './hello.workflow';

@StudioApp({
  title: 'Hello World App',
  workflows: [HelloWorkflow],
})
@Module({
  imports: [
    ClaudeModule,
    LlmProviderModule.forFeature({ model: 'claude-sonnet-4-5' }),
  ],
  providers: [HelloWorkflow],
})
export class HelloModule {}
