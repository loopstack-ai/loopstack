import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { GitHubModule } from '@loopstack/github-module';
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { AuthenticateGitHubTask } from './shared/github/authenticate-github-task.tool';
import { AuthenticateGoogleTask } from './shared/google/authenticate-google-task.tool';
import { GoogleCalendarFetchEventsTool } from './shared/google/google-calendar-fetch-events.tool';
import { GithubAgentExampleWorkflow } from './workflows/github-agent/github-agent-example.workflow';
import { GithubOverviewExampleWorkflow } from './workflows/github-overview/github-overview-example.workflow';
import { GoogleCalendarSummaryExampleWorkflow } from './workflows/google-calendar-summary/google-calendar-summary-example.workflow';
import { GoogleWorkspaceAgentExampleWorkflow } from './workflows/google-workspace-agent/google-workspace-agent-example.workflow';

const WORKFLOWS = [
  GithubOverviewExampleWorkflow,
  GithubAgentExampleWorkflow,
  GoogleCalendarSummaryExampleWorkflow,
  GoogleWorkspaceAgentExampleWorkflow,
];

@StudioApp({
  title: 'OAuth Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [ClaudeModule, GitHubModule, GoogleWorkspaceModule],
  providers: [AuthenticateGitHubTask, AuthenticateGoogleTask, GoogleCalendarFetchEventsTool, ...WORKFLOWS],
  exports: [AuthenticateGitHubTask, AuthenticateGoogleTask, GoogleCalendarFetchEventsTool, ...WORKFLOWS],
})
export class OAuthExamplesModule {}
