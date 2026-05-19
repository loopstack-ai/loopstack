import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { WebFetchFetcherService, WebFetchMarkdownService, WebFetchSummarizerService } from './services/index.js';
import { WebFetchTool } from './tools/index.js';

@Module({
  imports: [ClaudeModule],
  providers: [WebFetchMarkdownService, WebFetchFetcherService, WebFetchSummarizerService, WebFetchTool],
  exports: [WebFetchTool],
})
export class WebModule {}
