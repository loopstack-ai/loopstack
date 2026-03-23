import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { GoogleCalendarFetchEventsTool } from './tools';
import { CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, CoreUiModule, CreateChatMessageToolModule, AiModule, GoogleWorkspaceModule],
  providers: [GoogleCalendarFetchEventsTool, CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow],
  exports: [GoogleCalendarFetchEventsTool, CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow],
})
export class GoogleExampleModule {}
