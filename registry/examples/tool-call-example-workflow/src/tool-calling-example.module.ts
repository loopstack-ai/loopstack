import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { ToolCallWorkflow } from './tool-call.workflow.js';
import { GetWeather } from './tools/get-weather.tool.js';

@Module({
  imports: [ClaudeModule],
  providers: [GetWeather, ToolCallWorkflow],
  exports: [ToolCallWorkflow],
})
export class ToolCallingExampleModule {}
