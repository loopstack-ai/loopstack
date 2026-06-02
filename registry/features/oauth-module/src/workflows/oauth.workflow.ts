import { z } from 'zod';
import type { LoopstackContext } from '@loopstack/common';
import { BaseWorkflow, ToolResult, Transition, Workflow } from '@loopstack/common';
import { OAuthPromptDocument } from '../documents/index.js';
import { BuildOAuthUrlResult, BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../tools/index.js';

interface OAuthArgs {
  provider: string;
  scopes: string[];
}

interface OAuthState {
  provider: string;
  scopes: string[];
  oauthState?: string;
  authUrl?: string;
}

@Workflow({
  title: 'OAuth',
  description:
    'Authenticate with an OAuth 2.0 provider.\nCan be run standalone to pre-authenticate, or invoked from\nother workflows when authentication is required.',
  schema: z
    .object({
      provider: z.string(),
      scopes: z.array(z.string()).default([]),
    })
    .strict(),
})
export class OAuthWorkflow extends BaseWorkflow<OAuthArgs, OAuthState> {
  constructor(
    private readonly buildOAuthUrl: BuildOAuthUrlTool,
    private readonly exchangeOAuthToken: ExchangeOAuthTokenTool,
  ) {
    super();
  }

  @Transition({ to: 'awaiting_auth' })
  async initiateOAuth(state: OAuthState, ctx: LoopstackContext): Promise<OAuthState> {
    const args = ctx.args as OAuthArgs;
    const result: ToolResult<BuildOAuthUrlResult> = await this.buildOAuthUrl.call({
      provider: args.provider,
      scopes: args.scopes,
    });

    const oauthState = result.data!.state;
    const authUrl = result.data!.authUrl;

    await this.documentStore.save(
      OAuthPromptDocument,
      {
        provider: args.provider,
        authUrl,
        state: oauthState,
        status: 'pending' as const,
      },
      { id: 'oauthPrompt' },
    );

    return { ...state, provider: args.provider, scopes: args.scopes, oauthState, authUrl };
  }

  @Transition({
    from: 'awaiting_auth',
    to: 'end',
    wait: true,
    schema: z.object({ code: z.string(), state: z.string() }),
  })
  async exchangeToken(
    state: OAuthState,
    payload: { code: string; state: string },
  ): Promise<{ authenticated: boolean }> {
    await this.exchangeOAuthToken.call({
      provider: state.provider,
      code: payload.code,
      state: payload.state,
      expectedState: state.oauthState!,
    });

    await this.documentStore.save(
      OAuthPromptDocument,
      {
        provider: state.provider,
        authUrl: state.authUrl!,
        state: state.oauthState!,
        status: 'success' as const,
        message: 'Successfully connected.',
      },
      { id: 'oauthPrompt' },
    );

    return { authenticated: true };
  }
}
