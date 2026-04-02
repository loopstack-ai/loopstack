import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  Final,
  Initial,
  InjectDocument,
  InjectTool,
  Input,
  Output,
  ToolResult,
  Workflow,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { OAuthPromptDocument } from '../documents';
import { BuildOAuthUrlResult, BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../tools';

@Injectable()
@Workflow({
  uiConfig: __dirname + '/oauth.workflow.yaml',
})
export class OAuthWorkflow extends BaseWorkflow {
  @InjectTool() buildOAuthUrl: BuildOAuthUrlTool;
  @InjectTool() exchangeOAuthToken: ExchangeOAuthTokenTool;
  @InjectDocument() oauthPromptDocument: OAuthPromptDocument;

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

  private runtime: WorkflowMetadataInterface;

  oauthState?: string;
  authUrl?: string;

  @Initial({ to: 'awaiting_auth' })
  async initiateOAuth() {
    const result: ToolResult<BuildOAuthUrlResult> = await this.buildOAuthUrl.run({
      provider: this.args.provider,
      scopes: this.args.scopes,
    });

    this.oauthState = result.data!.state;
    this.authUrl = result.data!.authUrl;

    await this.oauthPromptDocument.create({
      id: 'oauthPrompt',
      content: {
        provider: this.args.provider,
        authUrl: this.authUrl,
        state: this.oauthState,
        status: 'pending' as const,
      },
    });
  }

  @Final({ from: 'awaiting_auth', wait: true })
  async exchangeToken() {
    const payload = this.runtime.transition!.payload as { code: string; state: string };

    await this.exchangeOAuthToken.run({
      provider: this.args.provider,
      code: payload.code,
      state: payload.state,
      expectedState: this.oauthState!,
    });

    await this.oauthPromptDocument.create({
      id: 'oauthPrompt',
      content: {
        provider: this.args.provider,
        authUrl: this.authUrl!,
        state: this.oauthState!,
        status: 'success' as const,
        message: 'Successfully connected.',
      },
    });
  }

  @Output()
  result() {
    return {
      authenticated: true,
    };
  }
}
