import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GoogleOAuthProvider } from './google-oauth.provider';

@Module({
  imports: [OAuthModule],
  providers: [GoogleOAuthProvider],
  exports: [GoogleOAuthProvider],
})
export class GoogleOAuthModule {}
