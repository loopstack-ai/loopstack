import { Module } from '@nestjs/common';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { MicrosoftOAuthModule } from '../microsoft-oauth-module';
import { OAuthModule } from '../oauth-module';
import { OutlookFetchEventsTool } from './tools';
import { OutlookCalendarWorkflow } from './workflows';

@Module({
  imports: [CoreUiModule, CreateChatMessageToolModule, OAuthModule, MicrosoftOAuthModule],
  providers: [OutlookFetchEventsTool, OutlookCalendarWorkflow],
  exports: [OutlookFetchEventsTool, OutlookCalendarWorkflow],
})
export class MicrosoftExampleModule {}
