import { DynamicModule, Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import type { LlmModuleConfig } from '@loopstack/llm-provider';
import { ExploreTask } from './tools/explore-task.tool.js';

const PROVIDERS = [ExploreTask];

@Module({})
class CodeAgentRootModule {}

/**
 * NestJS module that provides the codebase-exploration tool `ExploreTask` (`explore_task`), which launches an `AgentWorkflow` sub-agent that searches and reads a remote workspace with the `glob`/`grep`/`read` tools and returns a synthesized answer.
 *
 * Registration:
 * - `CodeAgentModule` — bare import registers `ExploreTask` and re-exports `AgentModule`; use this when the agent's default LLM configuration is fine.
 * - `CodeAgentModule.forFeature(config?: { llm?: LlmModuleConfig })` — use to override the LLM provider/model for the code agent; it imports `AgentModule.forFeature(config)`.
 *
 * Requires, configured in your app:
 * - `LlmProviderModule` with a registered LLM provider — needed by the imported `AgentModule`.
 * - `RemoteClientModule` (bare or `forRoot`) — supplies the `glob`/`grep`/`read` tools the `explore_task` sub-agent uses. Without it the app fails at boot with an error naming `RemoteClientModule`.
 *
 * @public
 */
@Module({
  imports: [AgentModule],
  providers: PROVIDERS,
  exports: [...PROVIDERS, AgentModule],
})
export class CodeAgentModule {
  static forFeature(config?: { llm?: LlmModuleConfig }): DynamicModule {
    return {
      module: CodeAgentRootModule,
      imports: [AgentModule.forFeature(config)],
      providers: PROVIDERS,
      exports: [...PROVIDERS, AgentModule],
    };
  }
}
