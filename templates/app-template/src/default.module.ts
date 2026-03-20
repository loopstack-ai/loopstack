import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
