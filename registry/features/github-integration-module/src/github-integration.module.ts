import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git-module';
import { GitHubModule } from '@loopstack/github-module';
import { HitlModule } from '@loopstack/hitl';
import { OAuthModule } from '@loopstack/oauth-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { ConnectGitHubWorkflow } from './workflows/connect-github/connect-github.workflow.js';

@Module({
  imports: [GitModule, GitHubModule, HitlModule, OAuthModule, RemoteClientModule],
  providers: [ConnectGitHubWorkflow],
  exports: [ConnectGitHubWorkflow],
})
export class GitHubIntegrationModule {}
