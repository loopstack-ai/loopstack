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
 * LLM Provider Module — configures LLM tools with provider/model defaults.
 *
 * - Bare import (`LlmProviderModule`) — registers the global root with default config.
 * - `forRoot(config)` — sets the global default config.
 * - `forFeature(config)` — overrides config for a specific module's tools.
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
