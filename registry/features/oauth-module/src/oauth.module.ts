import { Global, Module } from '@nestjs/common';
import { OAuthProviderRegistry } from './services/oauth-provider-registry';
import { OAuthTokenStore } from './services/oauth-token-store';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from './tools';
import { OAuthWorkflow } from './workflows';

@Global()
@Module({
  providers: [OAuthProviderRegistry, OAuthTokenStore, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthWorkflow],
  exports: [OAuthProviderRegistry, OAuthTokenStore, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthWorkflow],
})
export class OAuthModule {}
