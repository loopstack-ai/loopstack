import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  InjectDocument,
  InjectTool,
  Input,
  Output,
  Runtime,
  State,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { OAuthPromptDocument } from '../documents';
import { BuildGoogleOAuthUrlTool } from '../tools';
import { ExchangeGoogleOAuthTokenTool } from '../tools';

@Injectable()
@Workflow({
  configFile: __dirname + '/google-oauth.workflow.yaml',
})
export class GoogleOAuthWorkflow implements WorkflowInterface {
  @InjectTool() private buildGoogleOAuthUrl: BuildGoogleOAuthUrlTool;
  @InjectTool() private exchangeGoogleOAuthToken: ExchangeGoogleOAuthTokenTool;
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectDocument() private oauthPromptDocument: OAuthPromptDocument;

  @Input({
    schema: z
      .object({
        scopes: z
          .array(z.string())
          .default([
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/calendar.readonly',
          ]),
      })
      .strict(),
  })
  args: {
    scopes: string[];
  };

  @State({
    schema: z
      .object({
        oauthState: z.string().optional(),
        authUrl: z.string().optional(),
      })
      .strict(),
  })
  state: {
    oauthState?: string;
    authUrl?: string;
  };

  @Runtime()
  runtime: any;

  @Output()
  result() {
    return {
      authenticated: true,
    };
  }
}
