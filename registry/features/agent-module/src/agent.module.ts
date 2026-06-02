import { DynamicModule, Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { AgentFinishTool } from './tools/agent-finish.tool.js';
import { AgentWorkflow } from './workflows/agent.workflow.js';
import { ChatAgentWorkflow } from './workflows/chat-agent.workflow.js';

const PROVIDERS = [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool];

@Module({})
class AgentRootModule {}

@Module({
  providers: PROVIDERS,
  exports: PROVIDERS,
})
export class AgentModule {
  static forFeature(config?: { llm?: LlmModuleConfig }): DynamicModule {
    return {
      module: AgentRootModule,
      imports: config?.llm ? [LlmProviderModule.forFeature(config.llm)] : [],
      providers: PROVIDERS,
      exports: PROVIDERS,
    };
  }
}
