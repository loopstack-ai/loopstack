import { DynamicModule, Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { ClaudeWebSearch } from './tools/index.js';

const PROVIDERS = [ClaudeWebSearch];

@Module({
  imports: [LlmProviderModule.forFeature({})],
  providers: PROVIDERS,
  exports: PROVIDERS,
})
export class ClaudeToolsModule {
  static forFeature(config: { llm: LlmModuleConfig }): DynamicModule {
    return {
      module: ClaudeToolsModule,
      imports: [LlmProviderModule.forFeature(config.llm)],
      providers: PROVIDERS,
      exports: PROVIDERS,
    };
  }
}
