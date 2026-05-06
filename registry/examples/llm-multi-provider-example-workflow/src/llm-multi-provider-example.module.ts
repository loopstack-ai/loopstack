import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { OpenAiModule } from '@loopstack/openai-module';
import { LlmMultiProviderWorkflow } from './llm-multi-provider.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule, OpenAiModule],
  providers: [LlmMultiProviderWorkflow],
  exports: [LlmMultiProviderWorkflow],
})
export class LlmMultiProviderExampleModule {}
