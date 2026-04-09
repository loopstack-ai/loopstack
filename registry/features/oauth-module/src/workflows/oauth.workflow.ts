import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, ToolResult, Workflow } from '@loopstack/common';
import { OAuthPromptDocument } from '../documents';
import { BuildOAuthUrlResult, BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../tools';

@Injectable()
@Workflow({
  uiConfig: __dirname + '/oauth.ui.yaml',
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
  async initiateOAuth(args: { provider: string; scopes: string[] }) {
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

  @Final({
    from: 'awaiting_auth',
    wait: true,
    schema: z.object({ code: z.string(), state: z.string() }),
  })
  async exchangeToken(payload: { code: string; state: string }): Promise<{ authenticated: boolean }> {
    const args = this.ctx.args as { provider: string; scopes: string[] };

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

    return { authenticated: true };
  }
}
