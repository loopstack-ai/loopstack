import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CalendarExampleModule } from './calendar-example-module';
import { DefaultWorkspace } from './default.workspace';
import { GoogleOAuthModule } from './google-oauth-module';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule, GoogleOAuthModule, CalendarExampleModule],
  providers: [DefaultWorkspace, HelloWorldWorkflow],
})
export class DefaultModule {}
