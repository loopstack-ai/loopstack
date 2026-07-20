import { DynamicModule, Global, Module } from '@nestjs/common';
import { LLM_MODULE_CONFIG } from './llm-provider.constants.js';
import type { LlmModuleConfig } from './llm-provider.constants.js';
import { LlmDelegateService } from './services/llm-delegate.service.js';
import { LlmProviderRegistry } from './services/llm-provider-registry.js';
import { LlmToolsHelperService } from './services/llm-tools-helper.service.js';
import { LlmDelegateToolCallsTool } from './tools/llm-delegate-tool-calls.tool.js';
import { LlmGenerateObjectTool } from './tools/llm-generate-object.tool.js';
import { LlmGenerateTextTool } from './tools/llm-generate-text.tool.js';
import { LlmUpdateToolResultTool } from './tools/llm-update-tool-result.tool.js';

const SERVICES = [LlmProviderRegistry, LlmToolsHelperService, LlmDelegateService];
const TOOLS = [LlmGenerateTextTool, LlmGenerateObjectTool, LlmDelegateToolCallsTool, LlmUpdateToolResultTool];

const DEFAULT_CONFIG: LlmModuleConfig = {};

/**
 * Internal global root module — provides shared services (registry, helpers)
 * and default tools globally. Separate class from LlmProviderModule so NestJS
 * doesn't deduplicate it with forFeature() imports.
 */
@Global()
@Module({
  providers: [{ provide: LLM_MODULE_CONFIG, useValue: DEFAULT_CONFIG }, ...SERVICES, ...TOOLS],
  exports: [LLM_MODULE_CONFIG, ...SERVICES, ...TOOLS],
})
class LlmProviderRootModule {}

/**
 * NestJS module that provides the LLM tools (`LlmGenerateTextTool`,
 * `LlmGenerateObjectTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`)
 * and the provider registry, configured with provider/model defaults.
 *
 * Registration:
 * - `LlmProviderModule` (bare import) — registers the global root with the default
 *   (empty) config; pair it with a provider module and set provider/model per call.
 * - `LlmProviderModule.forRoot(config)` — sets the app-wide default `LlmModuleConfig`
 *   (default provider/model). Import once at the root.
 * - `LlmProviderModule.forFeature(config)` — overrides the config for one module's
 *   tools without re-registering the global root. Use for a feature-scoped default.
 *
 * Requires: a registered provider module (e.g. `ClaudeModule` / `OpenAiModule`)
 * imported alongside it — this module holds the registry, the provider modules
 * populate it.
 *
 * @public
 */
@Module({ imports: [LlmProviderRootModule] })
export class LlmProviderModule {
  static forRoot(config: LlmModuleConfig): DynamicModule {
    return {
      module: LlmProviderRootModule,
      global: true,
      providers: [{ provide: LLM_MODULE_CONFIG, useValue: config }, ...SERVICES, ...TOOLS],
      exports: [LLM_MODULE_CONFIG, ...SERVICES, ...TOOLS],
    };
  }

  static forFeature(config: LlmModuleConfig): DynamicModule {
    return {
      module: LlmProviderModule,
      imports: [LlmProviderRootModule],
      providers: [{ provide: LLM_MODULE_CONFIG, useValue: config }, ...TOOLS],
      exports: [...TOOLS],
    };
  }
}
