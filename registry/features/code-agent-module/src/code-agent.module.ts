import { DynamicModule, Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { ExploreTask } from './tools/explore-task.tool.js';

const PROVIDERS = [ExploreTask];

@Module({})
class CodeAgentRootModule {}

@Module({
  imports: [AgentModule, RemoteClientModule.forRoot()],
  providers: PROVIDERS,
  exports: [...PROVIDERS, AgentModule, RemoteClientModule],
})
export class CodeAgentModule {
  static forFeature(config: { llm: LlmModuleConfig }): DynamicModule {
    return {
      module: CodeAgentRootModule,
      imports: [AgentModule.forFeature(config), RemoteClientModule.forRoot()],
      providers: PROVIDERS,
      exports: [...PROVIDERS, AgentModule, RemoteClientModule],
    };
  }
}
