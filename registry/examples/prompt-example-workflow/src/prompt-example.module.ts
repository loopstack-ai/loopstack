import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { PromptWorkflow } from './prompt.workflow';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [PromptWorkflow],
  exports: [PromptWorkflow],
})
export class PromptExampleModule {}
