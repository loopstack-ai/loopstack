import { DynamicModule, Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { ClaudeWebSearchStepTool } from './tools/index.js';

const PROVIDERS = [ClaudeWebSearchStepTool];

@Module({})
class ClaudeToolsRootModule {}

/**
 * NestJS module that provides Claude-specific workflow tools that consume the LLM provider — currently the `ClaudeWebSearchStepTool` workflow step (`claude_web_search_step`), which runs a web search as its own Claude request through `claude_native_web_search`.
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
