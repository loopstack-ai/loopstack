import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { DefaultWorkspace } from './default.workspace';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule],
  providers: [
    DefaultWorkspace,
    HelloWorldWorkflow,
  ],
})
export class DefaultModule {}