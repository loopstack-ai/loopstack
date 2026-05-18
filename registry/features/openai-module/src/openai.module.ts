import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { OpenAiClientService, OpenAiLlmProvider } from './services';

@Module({
  imports: [LlmProviderModule],
  providers: [OpenAiClientService, OpenAiLlmProvider],
  exports: [OpenAiClientService, OpenAiLlmProvider],
})
export class OpenAiModule {}
