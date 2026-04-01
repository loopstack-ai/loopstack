import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { DefaultWorkspace } from './default.workspace';
import { MeetingNotesExampleModule } from './meeting';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule, MeetingNotesExampleModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
