import { DynamicModule, Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { ExploreTask } from './tools/explore-task.tool.js';

const PROVIDERS = [ExploreTask];

@Module({})
class CodeAgentRootModule {}

@Module({
  imports: [AgentModule],
  providers: PROVIDERS,
  exports: [...PROVIDERS, AgentModule],
})
export class CodeAgentModule {
  static forFeature(config: { llm: LlmModuleConfig }): DynamicModule {
    return {
      module: CodeAgentRootModule,
      imports: [AgentModule.forFeature(config)],
      providers: PROVIDERS,
      exports: [...PROVIDERS, AgentModule],
    };
  }
}
