import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { GitHubModule } from '@loopstack/github';
import { AuthenticateGitHubTask } from './shared/github/authenticate-github-task.tool';
import { GithubAgentExampleWorkflow } from './workflows/github-agent/github-agent-example.workflow';
import { GithubOverviewExampleWorkflow } from './workflows/github-overview/github-overview-example.workflow';

const WORKFLOWS = [GithubOverviewExampleWorkflow, GithubAgentExampleWorkflow];

@StudioApp({
  title: 'GitHub Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [ClaudeModule, GitHubModule],
  providers: [AuthenticateGitHubTask, ...WORKFLOWS],
  exports: [AuthenticateGitHubTask, ...WORKFLOWS],
})
export class GitHubExamplesModule {}
