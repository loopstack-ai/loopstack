import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiModule } from '@loopstack/ai-module';
import { ChatWorkflow } from './chat.workflow';

@Module({
  imports: [LoopCoreModule, CoreUiModule, AiModule],
  providers: [
    ChatWorkflow,
  ],
  exports: [
    ChatWorkflow,
  ]
})
export class ChatExampleModule {}
