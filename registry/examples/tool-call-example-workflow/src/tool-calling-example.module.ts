import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { ToolCallWorkflow } from './tool-call.workflow';
import { GetWeather } from './tools/get-weather.tool';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [GetWeather, ToolCallWorkflow],
  exports: [ToolCallWorkflow],
})
export class ToolCallingExampleModule {}
