import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { AuthenticateGoogleTask, GoogleCalendarFetchEventsTool } from './tools/index.js';
import { CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow } from './workflows/index.js';

@Module({
  imports: [ClaudeModule, GoogleWorkspaceModule],
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
