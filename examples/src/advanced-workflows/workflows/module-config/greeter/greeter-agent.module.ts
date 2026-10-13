import { DynamicModule, Module } from '@nestjs/common';
import type { GreeterConfig } from './greeter.constants.js';
import { GreeterModule } from './greeter.module.js';
import { GreeterTool } from './greeter.tool.js';

/**
 * Example "wrapper" module — analogous to AgentModule.
 *
 * Demonstrates how a module that depends on a configurable module (GreeterModule)
 * can pass config through via its own forFeature() method.
 *
 * forFeature() re-exports the configured GreeterModule.forFeature() import instead of
 * providing its own GreeterTool: a GreeterTool provided here would resolve the global
 * config and hide the one passed through.
 *
 * The RootModule class prevents NestJS deduplication between the bare import
 * (static decorator) and the forFeature() dynamic import.
 */

@Module({})
class GreeterAgentRootModule {}

@Module({
  imports: [GreeterModule],
  providers: [GreeterTool],
  exports: [GreeterTool],
})
export class GreeterAgentModule {
  static forFeature(config: { greeter: GreeterConfig }): DynamicModule {
    const greeter = GreeterModule.forFeature(config.greeter);
    return {
      module: GreeterAgentRootModule,
      imports: [greeter],
      exports: [greeter],
    };
  }
}
