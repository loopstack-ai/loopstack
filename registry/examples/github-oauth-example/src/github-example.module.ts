import { Module } from '@nestjs/common';
import { AiModule } from '@loopstack/ai-module';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { GitHubModule } from '@loopstack/github-module';
import { GitHubAgentWorkflow, GitHubReposOverviewWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, CoreUiModule, CreateChatMessageToolModule, AiModule, GitHubModule],
  providers: [GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
  exports: [GitHubReposOverviewWorkflow, GitHubAgentWorkflow],
})
export class GitHubExampleModule {}
