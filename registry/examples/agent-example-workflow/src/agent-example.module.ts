import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { AgentExampleWorkflow } from './agent-example.workflow.js';
import { CalculatorTool } from './tools/calculator.tool.js';
import { WeatherLookupTool } from './tools/weather-lookup.tool.js';

@Module({
  imports: [AgentModule],
  providers: [AgentExampleWorkflow, CalculatorTool, WeatherLookupTool],
  exports: [AgentExampleWorkflow, CalculatorTool, WeatherLookupTool],
})
export class AgentExampleModule {}
