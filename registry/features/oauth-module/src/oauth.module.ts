import { Global, Module } from '@nestjs/common';
import { OAuthProviderRegistry } from './services/oauth-provider-registry.js';
import { OAuthTokenStore } from './services/oauth-token-store.js';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from './tools/index.js';
import { OAuthWorkflow } from './workflows/index.js';

@Global()
@Module({
  providers: [OAuthProviderRegistry, OAuthTokenStore, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthWorkflow],
  exports: [OAuthProviderRegistry, OAuthTokenStore, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthWorkflow],
})
export class OAuthModule {}
