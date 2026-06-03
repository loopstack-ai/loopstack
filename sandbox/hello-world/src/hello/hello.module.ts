import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { HelloController } from './hello.controller';
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
  controllers: [HelloController],
  providers: [HelloWorkflow],
})
export class HelloModule {}
