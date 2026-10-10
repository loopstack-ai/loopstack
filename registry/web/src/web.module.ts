import { Module } from '@nestjs/common';
import { WebFetchFetcherService, WebFetchMarkdownService, WebFetchSummarizerService } from './services/index.js';
import { WebFetchTool } from './tools/index.js';

/**
 * NestJS module that provides the `web_fetch` tool (`WebFetchTool`) and its supporting services —
 * fetches a URL, converts HTML to Markdown, and optionally summarizes the content with the configured LLM provider.
 *
 * Registration:
 * - `WebModule` — bare import; registers the `WebFetchTool` and the fetcher, Markdown, and summarizer
 *   services. There are no static configuration methods.
 *
 * Requires: `LlmProviderModule` imported alongside it (the summarizer resolves its provider from the
 * global `LlmProviderRegistry`). The optional summarization step (triggered when a `prompt` arg is
 * passed) also needs a provider module such as `ClaudeModule` or `OpenAiModule` and its API key. It
 * uses the tool's `provider` arg, else the `LlmProviderModule` default provider, else `claude`, and
 * the tool's `model` arg, else `CLAUDE_WEB_FETCH_MODEL`, else `claude-haiku-4-5-20251001` — pass `model`
 * when summarizing with a provider other than `claude`.
 *
 * @public
 */
@Module({
  providers: [WebFetchMarkdownService, WebFetchFetcherService, WebFetchSummarizerService, WebFetchTool],
  exports: [WebFetchTool],
})
export class WebModule {}
