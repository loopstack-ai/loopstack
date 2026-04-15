import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { GitHubModule } from '@loopstack/github-module';
import { AuthenticateGitHubTask } from './tools';
import { GitHubAgentWorkflow, GitHubReposOverviewWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, ClaudeModule, GitHubModule],
  providers: [AuthenticateGitHubTask, GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
  exports: [AuthenticateGitHubTask, GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
})
export class GitHubExampleModule {}
