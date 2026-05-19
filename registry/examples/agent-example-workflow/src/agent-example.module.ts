import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { AgentExampleWorkflow } from './agent-example.workflow';
import { CalculatorTool } from './tools/calculator.tool';
import { WeatherLookupTool } from './tools/weather-lookup.tool';

@Module({
  imports: [AgentModule],
  providers: [AgentExampleWorkflow, CalculatorTool, WeatherLookupTool],
  exports: [AgentExampleWorkflow, CalculatorTool, WeatherLookupTool],
})
export class AgentExampleModule {}
