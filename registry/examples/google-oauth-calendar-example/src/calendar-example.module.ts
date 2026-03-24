import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { GoogleCalendarFetchEventsTool } from './tools';
import { CalendarSummaryWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule, GoogleWorkspaceModule],
  providers: [GoogleCalendarFetchEventsTool, CalendarSummaryWorkflow],
  exports: [GoogleCalendarFetchEventsTool, CalendarSummaryWorkflow],
})
export class CalendarExampleModule {}
