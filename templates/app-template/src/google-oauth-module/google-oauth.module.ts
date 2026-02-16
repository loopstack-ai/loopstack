import { Module } from '@nestjs/common';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { AuthRequiredDocument, OAuthPromptDocument } from './documents';
import { GoogleAuthService } from './services';
import { BuildGoogleOAuthUrlTool, ExchangeGoogleOAuthTokenTool } from './tools';
import { GoogleOAuthWorkflow } from './workflows';

@Module({
  imports: [CoreUiModule, CreateChatMessageToolModule],
  providers: [
    GoogleAuthService,
    AuthRequiredDocument,
    OAuthPromptDocument,
    BuildGoogleOAuthUrlTool,
    ExchangeGoogleOAuthTokenTool,
    GoogleOAuthWorkflow,
  ],
  exports: [
    GoogleAuthService,
    AuthRequiredDocument,
    OAuthPromptDocument,
    BuildGoogleOAuthUrlTool,
    ExchangeGoogleOAuthTokenTool,
    GoogleOAuthWorkflow,
  ],
})
export class GoogleOAuthModule {}
