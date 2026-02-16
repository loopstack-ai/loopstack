import { Module } from '@nestjs/common';
import { OAuthModule } from '../oauth-module';
import { GitHubOAuthProvider } from './github-oauth.provider';

@Module({
  imports: [OAuthModule],
  providers: [GitHubOAuthProvider],
  exports: [GitHubOAuthProvider],
})
export class GitHubOAuthModule {}
