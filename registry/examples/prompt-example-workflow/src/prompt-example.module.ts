import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { PromptWorkflow } from './prompt.workflow';
import { AiModule } from '@loopstack/ai-module';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [
    PromptWorkflow,
  ],
  exports: [
    PromptWorkflow,
  ]
})
export class PromptExampleModule {}
