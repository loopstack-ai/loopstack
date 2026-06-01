import { Module } from '@nestjs/common';
import { OpenAiClientService, OpenAiLlmProvider } from './services/index.js';

@Module({
  providers: [OpenAiClientService, OpenAiLlmProvider],
  exports: [OpenAiClientService, OpenAiLlmProvider],
})
export class OpenAiModule {}
