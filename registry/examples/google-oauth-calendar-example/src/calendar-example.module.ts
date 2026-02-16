import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { GoogleOAuthModule } from '@loopstack/google-oauth-module';
import { GoogleCalendarFetchEventsTool } from './tools';
import { CalendarSummaryWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, CoreUiModule, CreateChatMessageToolModule, GoogleOAuthModule],
  providers: [GoogleCalendarFetchEventsTool, CalendarSummaryWorkflow],
  exports: [GoogleCalendarFetchEventsTool, CalendarSummaryWorkflow],
})
export class CalendarExampleModule {}
