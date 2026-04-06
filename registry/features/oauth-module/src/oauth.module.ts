import { Global, Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { OAuthProviderRegistry } from './services/oauth-provider-registry';
import { OAuthTokenStore } from './services/oauth-token-store';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from './tools';
import { OAuthWorkflow } from './workflows';

@Global()
@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule],
  providers: [OAuthProviderRegistry, OAuthTokenStore, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthWorkflow],
  exports: [OAuthProviderRegistry, OAuthTokenStore, BuildOAuthUrlTool, ExchangeOAuthTokenTool, OAuthWorkflow],
})
export class OAuthModule {}
