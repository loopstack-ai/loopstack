import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Output, ToolResult, Workflow } from '@loopstack/common';
import { OAuthPromptDocument } from '../documents';
import { BuildOAuthUrlResult, BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../tools';

@Injectable()
@Workflow({
  uiConfig: __dirname + '/oauth.workflow.yaml',
  schema: z
    .object({
      provider: z.string(),
      scopes: z.array(z.string()).default([]),
    })
    .strict(),
})
export class OAuthWorkflow extends BaseWorkflow<{ provider: string; scopes: string[] }> {
  @InjectTool() buildOAuthUrl: BuildOAuthUrlTool;
  @InjectTool() exchangeOAuthToken: ExchangeOAuthTokenTool;

  oauthState?: string;
  authUrl?: string;

  @Initial({ to: 'awaiting_auth' })
  async initiateOAuth() {
    const args = this.ctx.args as { provider: string; scopes: string[] };
    const result: ToolResult<BuildOAuthUrlResult> = await this.buildOAuthUrl.call({
      provider: args.provider,
      scopes: args.scopes,
    });

    this.oauthState = result.data!.state;
    this.authUrl = result.data!.authUrl;

    await this.repository.save(
      OAuthPromptDocument,
      {
        provider: args.provider,
        authUrl: this.authUrl,
        state: this.oauthState,
        status: 'pending' as const,
      },
      { id: 'oauthPrompt' },
    );
  }

  @Final({ from: 'awaiting_auth', wait: true })
  async exchangeToken() {
    const args = this.ctx.args as { provider: string; scopes: string[] };
    const payload = this.ctx.runtime.transition!.payload as { code: string; state: string };

    await this.exchangeOAuthToken.call({
      provider: args.provider,
      code: payload.code,
      state: payload.state,
      expectedState: this.oauthState!,
    });

    await this.repository.save(
      OAuthPromptDocument,
      {
        provider: args.provider,
        authUrl: this.authUrl!,
        state: this.oauthState!,
        status: 'success' as const,
        message: 'Successfully connected.',
      },
      { id: 'oauthPrompt' },
    );
  }

  @Output()
  result() {
    return {
      authenticated: true,
    };
  }
}
