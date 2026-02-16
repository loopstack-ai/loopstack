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
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../tools';

@Injectable()
@Workflow({
  configFile: __dirname + '/oauth.workflow.yaml',
})
export class OAuthWorkflow implements WorkflowInterface {
  @InjectTool() private buildOAuthUrl: BuildOAuthUrlTool;
  @InjectTool() private exchangeOAuthToken: ExchangeOAuthTokenTool;
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectDocument() private oauthPromptDocument: OAuthPromptDocument;

  @Input({
    schema: z
      .object({
        provider: z.string(),
        scopes: z.array(z.string()).default([]),
      })
      .strict(),
  })
  args: {
    provider: string;
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
