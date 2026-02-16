import { Module } from '@nestjs/common';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { GitHubOAuthModule } from '../github-oauth-module';
import { OAuthModule } from '../oauth-module';
import { GitHubOpenPRsTool } from './tools';
import { GitHubOpenPRsWorkflow } from './workflows';

@Module({
  imports: [CoreUiModule, CreateChatMessageToolModule, OAuthModule, GitHubOAuthModule],
  providers: [GitHubOpenPRsTool, GitHubOpenPRsWorkflow],
  exports: [GitHubOpenPRsTool, GitHubOpenPRsWorkflow],
})
export class GitHubExampleModule {}
