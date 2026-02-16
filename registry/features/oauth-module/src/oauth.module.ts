import { Global, Module } from '@nestjs/common';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { AuthRequiredDocument, OAuthPromptDocument } from './documents';
import { OAuthProviderRegistry } from './services/oauth-provider-registry';
import { OAuthTokenStore } from './services/oauth-token-store';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from './tools';
import { OAuthWorkflow } from './workflows';

@Global()
@Module({
  imports: [CoreUiModule, CreateChatMessageToolModule],
  providers: [
    OAuthProviderRegistry,
    OAuthTokenStore,
    AuthRequiredDocument,
    OAuthPromptDocument,
    BuildOAuthUrlTool,
    ExchangeOAuthTokenTool,
    OAuthWorkflow,
  ],
  exports: [
    OAuthProviderRegistry,
    OAuthTokenStore,
    AuthRequiredDocument,
    OAuthPromptDocument,
    BuildOAuthUrlTool,
    ExchangeOAuthTokenTool,
    OAuthWorkflow,
  ],
})
export class OAuthModule {}
