import { Module } from '@nestjs/common';
import { ClaudeClientService, ClaudeLlmProvider } from './services/index.js';
import { ClaudeWebSearchServerTool } from './tools/index.js';

@Module({
  providers: [ClaudeClientService, ClaudeLlmProvider, ClaudeWebSearchServerTool],
  exports: [ClaudeClientService, ClaudeLlmProvider, ClaudeWebSearchServerTool],
})
export class ClaudeModule {}
