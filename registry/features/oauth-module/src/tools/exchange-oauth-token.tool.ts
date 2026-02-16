import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { OAuthProviderRegistry } from '../services';
import { OAuthTokenStore } from '../services';

export type ExchangeOAuthTokenArgs = {
  provider: string;
  code: string;
  state: string;
  expectedState: string;
};

@Tool({
  config: {
    description:
      'Exchanges an OAuth 2.0 authorization code for access and refresh tokens, and stores them globally for the user.',
  },
})
export class ExchangeOAuthTokenTool implements ToolInterface {
  private readonly logger = new Logger(ExchangeOAuthTokenTool.name);

  @Inject()
  private providerRegistry: OAuthProviderRegistry;

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        provider: z.string(),
        code: z.string(),
        state: z.string(),
        expectedState: z.string(),
      })
      .strict(),
  })
  args: ExchangeOAuthTokenArgs;

  async execute(
    args: ExchangeOAuthTokenArgs,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    if (args.state !== args.expectedState) {
      throw new Error('OAuth state mismatch. Possible CSRF attack.');
    }

    const provider = this.providerRegistry.get(args.provider);
    const tokenSet = await provider.exchangeCode(args.code);

    this.tokenStore.storeFromTokenSet(ctx.userId, args.provider, tokenSet);

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
