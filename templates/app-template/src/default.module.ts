import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { DefaultWorkspace } from './default.workspace';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule],
  providers: [DefaultWorkspace, HelloWorldWorkflow],
})
export class DefaultModule {}
