import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { WebFetchFetcherService, WebFetchMarkdownService, WebFetchSummarizerService } from './services';
import { WebFetchTool } from './tools';

@Module({
  imports: [ClaudeModule],
  providers: [WebFetchMarkdownService, WebFetchFetcherService, WebFetchSummarizerService, WebFetchTool],
  exports: [WebFetchTool],
})
export class WebModule {}
