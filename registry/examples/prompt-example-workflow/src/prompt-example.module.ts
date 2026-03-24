import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { PromptWorkflow } from './prompt.workflow';

@Module({
  imports: [LoopCoreModule, AiModule],
  providers: [PromptWorkflow],
  exports: [PromptWorkflow],
})
export class PromptExampleModule {}
