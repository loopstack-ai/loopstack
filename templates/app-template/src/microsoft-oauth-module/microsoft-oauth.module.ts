import { Module } from '@nestjs/common';
import { OAuthModule } from '../oauth-module';
import { MicrosoftOAuthProvider } from './microsoft-oauth.provider';

@Module({
  imports: [OAuthModule],
  providers: [MicrosoftOAuthProvider],
  exports: [MicrosoftOAuthProvider],
})
export class MicrosoftOAuthModule {}
