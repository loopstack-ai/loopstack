import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { WebFetchFetcherService, WebFetchMarkdownService, WebFetchSummarizerService } from './services/index.js';
import { WebFetchTool } from './tools/index.js';

/**
 * NestJS module that provides the `web_fetch` tool (`WebFetchTool`) and its supporting services —
 * fetches a URL, converts HTML to Markdown, and optionally summarizes the content with Claude.
 *
 * Registration:
 * - `WebModule` — bare import; registers the `WebFetchTool` and the fetcher, Markdown, and summarizer
 *   services. There are no static configuration methods.
 *
 * Requires: nothing beyond importing the module for plain fetch-and-convert use. The optional
 * summarization step (triggered when a `prompt` arg is passed) runs through the co-imported
 * `ClaudeModule` and needs an Anthropic API key — read from `ANTHROPIC_API_KEY` by default, overridable
 * per call via the tool's `envApiKey` arg.
 *
 * @public
 */
@Module({
  imports: [ClaudeModule],
  providers: [WebFetchMarkdownService, WebFetchFetcherService, WebFetchSummarizerService, WebFetchTool],
  exports: [WebFetchTool],
})
export class WebModule {}
