import { DynamicModule, Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { ClaudeWebSearch } from './tools/index.js';

const PROVIDERS = [ClaudeWebSearch];

@Module({})
class ClaudeToolsRootModule {}

/**
 * NestJS module that provides Claude-specific workflow tools that consume the LLM provider — currently the `ClaudeWebSearch` tool (`claude_web_search`), which runs a web search through the `claude` provider's built-in `web_search` server tool.
 *
 * Registration:
 * - `ClaudeToolsModule` — bare import registers the tool providers; use this when `LlmProviderModule` is already configured elsewhere in the app and you just want the tools available.
 * - `ClaudeToolsModule.forFeature(config: { llm: LlmModuleConfig })` — use to scope the LLM provider/model configuration for these tools; it imports `LlmProviderModule.forFeature(config.llm)` alongside the providers.
 *
 * Requires: `LlmProviderModule` must be available (it supplies the `LlmGenerateTextTool` the tool injects) — either configured app-wide or via `forFeature`; and a registered Claude provider (import `ClaudeModule`) with a valid `ANTHROPIC_API_KEY`, since the search executes through the `claude` provider.
 *
 * @public
 */
@Module({
  providers: PROVIDERS,
  exports: PROVIDERS,
})
export class ClaudeToolsModule {
  static forFeature(config: { llm: LlmModuleConfig }): DynamicModule {
    return {
      module: ClaudeToolsRootModule,
      imports: [LlmProviderModule.forFeature(config.llm)],
      providers: PROVIDERS,
      exports: PROVIDERS,
    };
  }
}
