import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace';
import { AuthenticateGoogleTask } from './shared/google/authenticate-google-task.tool';
import { GoogleCalendarSummaryExampleWorkflow } from './workflows/google-calendar-summary/google-calendar-summary-example.workflow';
import { GoogleWorkspaceAgentExampleWorkflow } from './workflows/google-workspace-agent/google-workspace-agent-example.workflow';

const WORKFLOWS = [GoogleCalendarSummaryExampleWorkflow, GoogleWorkspaceAgentExampleWorkflow];

@StudioApp({
  title: 'Google Workspace Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [ClaudeModule, GoogleWorkspaceModule],
  providers: [AuthenticateGoogleTask, ...WORKFLOWS],
  exports: [AuthenticateGoogleTask, ...WORKFLOWS],
})
export class GoogleWorkspaceExamplesModule {}
