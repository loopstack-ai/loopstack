import { Module } from '@nestjs/common';
import { OAuthModule } from '@loopstack/oauth';
import { MockApiClient } from './mock-api.client';
import { MockAuthorizationServerController } from './mock-authorization-server.controller';
import { MockOAuthProvider } from './mock-oauth.provider';

/**
 * Importing this module is all an app needs: the provider registers itself when the module starts.
 * The controller is the mock server; a provider for a real service has none.
 */
@Module({
  imports: [OAuthModule],
  controllers: [MockAuthorizationServerController],
  providers: [MockOAuthProvider, MockApiClient],
  exports: [MockOAuthProvider, MockApiClient],
})
export class MockProviderModule {}
