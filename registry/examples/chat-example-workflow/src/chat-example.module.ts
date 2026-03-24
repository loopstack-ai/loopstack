import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { ChatWorkflow } from './chat.workflow';

@Module({
  imports: [LoopCoreModule, AiModule],
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class ChatExampleModule {}
