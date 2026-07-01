import { Module } from '@nestjs/common';
import { ClaudeClientService, ClaudeLlmProvider } from './services/index.js';
import { ClaudeWebSearchServerTool } from './tools/index.js';

/**
 * NestJS module that provides the Claude LLM provider (`ClaudeLlmProvider`, registered under provider id `claude`), the `ClaudeClientService`, and the `ClaudeWebSearchServerTool` server tool.
 *
 * Registration:
 * - `ClaudeModule` — bare import is all that is needed; there are no static methods. On startup the provider registers itself into the LLM provider registry, after which `claude` can be selected as a provider in LLM tools and workflows.
 *
 * Requires: must be co-imported with `LlmProviderModule`, which supplies the `LlmProviderRegistry` the provider registers into; and an Anthropic API key, read from the `ANTHROPIC_API_KEY` env var by default (override the env var name per call via `envApiKey`).
 *
 * @public
 */
@Module({
  providers: [ClaudeClientService, ClaudeLlmProvider, ClaudeWebSearchServerTool],
  exports: [ClaudeClientService, ClaudeLlmProvider, ClaudeWebSearchServerTool],
})
export class ClaudeModule {}
