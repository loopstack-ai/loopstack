import { DynamicModule, Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { AgentFinishTool } from './tools/agent-finish.tool.js';
import { AgentWorkflow } from './workflows/agent.workflow.js';
import { ChatAgentWorkflow } from './workflows/chat-agent.workflow.js';

const PROVIDERS = [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool];

@Module({})
class AgentRootModule {}

/**
 * NestJS module that provides the agent workflows (`AgentWorkflow`,
 * `ChatAgentWorkflow`) and the `AgentFinishTool`.
 *
 * Registration:
 * - `AgentModule` (bare import) — registers the agent workflows; the LLM
 *   provider/model defaults come from whatever `LlmProviderModule` is configured
 *   app-wide.
 * - `AgentModule.forFeature({ llm })` — same workflows, but with a feature-scoped
 *   `LlmProviderModule.forFeature(llm)` so this scope uses its own provider/model
 *   defaults.
 *
 * Requires: `LlmProviderModule` plus a registered provider module (e.g.
 * `ClaudeModule` / `OpenAiModule`) available in the app — the agent loop runs its
 * turns through that provider.
 *
 * @public
 */
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
