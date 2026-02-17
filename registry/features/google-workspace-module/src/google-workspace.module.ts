import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GoogleWorkspaceOAuthProvider } from './google-workspace-oauth.provider';

@Module({
  imports: [OAuthModule],
  providers: [GoogleWorkspaceOAuthProvider],
  exports: [GoogleWorkspaceOAuthProvider],
})
export class GoogleWorkspaceModule {}
