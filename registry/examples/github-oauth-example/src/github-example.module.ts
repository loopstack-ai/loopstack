import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { GitHubModule } from '@loopstack/github-module';
import { AuthenticateGitHubTask } from './tools';
import { GitHubAgentWorkflow, GitHubReposOverviewWorkflow } from './workflows';

@Module({
  imports: [ClaudeModule, GitHubModule],
  providers: [AuthenticateGitHubTask, GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
  exports: [AuthenticateGitHubTask, GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
})
export class GitHubExampleModule {}
