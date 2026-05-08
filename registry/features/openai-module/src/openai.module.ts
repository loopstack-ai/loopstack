import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { OpenAiClientService, OpenAiLlmProvider } from './services';

@Module({
  imports: [LoopCoreModule, LlmProviderModule],
  providers: [OpenAiClientService, OpenAiLlmProvider],
  exports: [OpenAiClientService, OpenAiLlmProvider],
})
export class OpenAiModule {}
