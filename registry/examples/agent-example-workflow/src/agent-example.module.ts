import { DynamicModule, Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { AgentExampleWorkflow } from './agent-example.workflow';
import { CalculatorTool } from './tools/calculator.tool';
import { WeatherLookupTool } from './tools/weather-lookup.tool';

const PROVIDERS = [AgentExampleWorkflow, CalculatorTool, WeatherLookupTool];

@Module({})
class AgentExampleRootModule {}

@Module({
  imports: [AgentModule],
  providers: PROVIDERS,
  exports: PROVIDERS,
})
export class AgentExampleModule {
  static forFeature(config?: { llm?: LlmModuleConfig }): DynamicModule {
    return {
      module: AgentExampleRootModule,
      imports: [AgentModule.forFeature(config)],
      providers: PROVIDERS,
      exports: PROVIDERS,
    };
  }
}
