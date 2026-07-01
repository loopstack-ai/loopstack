import { DynamicModule, Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
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
 * Requires: imports `AgentModule`, which in turn requires `LlmProviderModule` (with a registered LLM provider) and `RemoteClientModule` (which supplies the `glob`/`grep`/`read` tools) to be configured in your app.
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
