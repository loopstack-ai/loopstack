import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { ClaudeClientService, ClaudeLlmProvider } from './services';
import { ClaudeWebSearch, ClaudeWebSearchServerTool } from './tools';

@Module({
  imports: [LlmProviderModule],
  providers: [ClaudeClientService, ClaudeLlmProvider, ClaudeWebSearch, ClaudeWebSearchServerTool],
  exports: [ClaudeClientService, ClaudeLlmProvider, ClaudeWebSearch, ClaudeWebSearchServerTool],
})
export class ClaudeModule {}
