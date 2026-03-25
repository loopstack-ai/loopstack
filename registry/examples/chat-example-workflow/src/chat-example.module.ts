import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { ChatWorkflow } from './chat.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class ChatExampleModule {}
