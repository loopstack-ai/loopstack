import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { OAuthPromptDocument } from '../documents/index.js';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../tools/index.js';

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

/**
 * Workflow that runs the OAuth 2.0 authorization code flow for a provider: it builds the auth URL, prompts
 * the user via an `OAuthPromptDocument`, and exchanges the returned code for stored tokens. Run it standalone
 * to pre-authenticate or invoke it from another workflow when authentication is required.
 *
 * @providedBy OAuthModule
 * @public
 */
@Workflow({
  name: 'oauth',
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
export class OAuthWorkflow extends BaseWorkflow<OAuthArgs> {
  constructor(
    private readonly buildOAuthUrl: BuildOAuthUrlTool,
    private readonly exchangeOAuthToken: ExchangeOAuthTokenTool,
  ) {
    super();
  }

  @Transition({ to: 'awaiting_auth' })
  async initiateOAuth(state: OAuthState, ctx: RunContext<OAuthArgs>) {
    const result = await this.buildOAuthUrl.call({
      provider: ctx.args.provider,
      scopes: ctx.args.scopes,
    });

    const oauthState = result.data.state;
    const authUrl = result.data.authUrl;

    await this.documentStore.save(
      OAuthPromptDocument,
      {
        provider: ctx.args.provider,
        authUrl,
        state: oauthState,
        status: 'pending' as const,
      },
      { key: 'oauthPrompt' },
    );

    this.assignState({ provider: ctx.args.provider, scopes: ctx.args.scopes, oauthState, authUrl });
  }

  @Transition({
    from: 'awaiting_auth',
    to: 'end',
    wait: true,
    schema: z.object({ code: z.string(), state: z.string() }),
  })
  async exchangeToken(state: OAuthState, input: TransitionInput<{ code: string; state: string }>) {
    await this.exchangeOAuthToken.call({
      provider: state.provider,
      code: input.data.code,
      state: input.data.state,
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
      { key: 'oauthPrompt' },
    );

    this.setResult({ authenticated: true } as unknown as Record<string, unknown>);
  }
}
