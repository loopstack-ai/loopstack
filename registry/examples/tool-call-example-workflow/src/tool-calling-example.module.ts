import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiModule } from '@loopstack/ai-module';
import { ToolCallWorkflow } from './tool-call.workflow';
import { GetWeather } from './tools/get-weather.tool';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [
    GetWeather,
    ToolCallWorkflow,
  ],
  exports: [
    ToolCallWorkflow,
  ]
})
export class ToolCallingExampleModule {}
