import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthProviderRegistry } from '../services';
import { OAuthTokenStore } from '../services';

const ExchangeOAuthTokenSchema = z
  .object({
    provider: z.string(),
    code: z.string(),
    state: z.string(),
    expectedState: z.string(),
  })
  .strict();

type ExchangeOAuthTokenArgs = z.infer<typeof ExchangeOAuthTokenSchema>;

@Tool({
  uiConfig: {
    description:
      'Exchanges an OAuth 2.0 authorization code for access and refresh tokens, and stores them globally for the user.',
  },
  schema: ExchangeOAuthTokenSchema,
})
export class ExchangeOAuthTokenTool extends BaseTool {
  private readonly logger = new Logger(ExchangeOAuthTokenTool.name);

  @Inject()
  private providerRegistry: OAuthProviderRegistry;

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: ExchangeOAuthTokenArgs): Promise<ToolResult> {
    if (args.state !== args.expectedState) {
      throw new Error('OAuth state mismatch. Possible CSRF attack.');
    }

    const provider = this.providerRegistry.get(args.provider);
    const tokenSet = await provider.exchangeCode(args.code);

    await this.tokenStore.storeFromTokenSet(this.ctx.context.userId, args.provider, tokenSet);

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
