import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { PromptWorkflow } from './prompt.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [PromptWorkflow],
  exports: [PromptWorkflow],
})
export class PromptExampleModule {}
