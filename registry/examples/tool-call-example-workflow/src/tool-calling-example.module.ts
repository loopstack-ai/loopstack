import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { ToolCallWorkflow } from './tool-call.workflow';
import { GetWeather } from './tools/get-weather.tool';

@Module({
  imports: [CoreUiModule, AiModule],
  providers: [GetWeather, ToolCallWorkflow],
  exports: [ToolCallWorkflow],
})
export class ToolCallingExampleModule {}
