import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { AuthenticateGoogleTask, GoogleCalendarFetchEventsTool } from './tools';
import { CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, ClaudeModule, GoogleWorkspaceModule],
  providers: [
    GoogleCalendarFetchEventsTool,
    AuthenticateGoogleTask,
    CalendarSummaryWorkflow,
    GoogleWorkspaceAgentWorkflow,
  ],
  exports: [
    GoogleCalendarFetchEventsTool,
    AuthenticateGoogleTask,
    CalendarSummaryWorkflow,
    GoogleWorkspaceAgentWorkflow,
  ],
})
export class GoogleExampleModule {}
