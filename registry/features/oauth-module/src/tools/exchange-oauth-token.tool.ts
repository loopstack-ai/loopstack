import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthProviderRegistry } from '../services/index.js';
import { OAuthTokenStore } from '../services/index.js';

/**
 * Zod schema for `ExchangeOAuthTokenTool` args.
 *
 * @public
 */
export const ExchangeOAuthTokenSchema = z
  .object({
    provider: z.string(),
    code: z.string(),
    state: z.string(),
    expectedState: z.string(),
  })
  .strict();

/**
 * Args for `ExchangeOAuthTokenTool`.
 *
 * @public
 */
export type ExchangeOAuthTokenArgs = z.infer<typeof ExchangeOAuthTokenSchema>;

/**
 * Result for `ExchangeOAuthTokenTool`.
 *
 * @public
 */
export type ExchangeOAuthTokenResult = {
  accessToken: string;
  refreshToken: string | undefined;
  expiresIn: number | undefined;
  scope: string | undefined;
};

/**
 * Tool that exchanges an OAuth 2.0 authorization code for access and refresh tokens and stores them for the user.
 *
 * @providedBy OAuthModule
 * @public
 */
@Tool({
  name: 'exchange_oauth_token',
  description:
    'Exchanges an OAuth 2.0 authorization code for access and refresh tokens, and stores them globally for the user.',
  schema: ExchangeOAuthTokenSchema,
})
export class ExchangeOAuthTokenTool extends BaseTool<ExchangeOAuthTokenArgs, object, ExchangeOAuthTokenResult> {
  private readonly logger = new Logger(ExchangeOAuthTokenTool.name);

  @Inject()
  private providerRegistry: OAuthProviderRegistry;

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: ExchangeOAuthTokenArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<ExchangeOAuthTokenResult>> {
    if (args.state !== args.expectedState) {
      throw new Error('OAuth state mismatch. Possible CSRF attack.');
    }

    const provider = this.providerRegistry.get(args.provider);
    const tokenSet = await provider.exchangeCode(args.code);

    await this.tokenStore.storeFromTokenSet(ctx.userId, args.provider, tokenSet);

    return {
      data: {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken,
        expiresIn: tokenSet.expiresIn,
        scope: tokenSet.scope,
      },
    };
  }
}
