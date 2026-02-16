import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CalendarExampleModule } from './calendar-example-module';
import { DefaultWorkspace } from './default.workspace';
import { GitHubExampleModule } from './github-example-module';
import { GitHubOAuthModule } from './github-oauth-module';
import { GoogleOAuthModule } from './google-oauth-module';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';
import { MicrosoftExampleModule } from './microsoft-example-module';
import { MicrosoftOAuthModule } from './microsoft-oauth-module';
import { OAuthModule } from './oauth-module';

@Module({
  imports: [
    LoopCoreModule,
    CreateChatMessageToolModule,

    // Generic OAuth infrastructure
    OAuthModule,

    // OAuth providers
    GoogleOAuthModule,
    MicrosoftOAuthModule,
    GitHubOAuthModule,

    // Example modules
    CalendarExampleModule,
    MicrosoftExampleModule,
    GitHubExampleModule,
  ],
  providers: [DefaultWorkspace, HelloWorldWorkflow],
})
export class DefaultModule {}
