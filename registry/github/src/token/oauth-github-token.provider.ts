import { Inject, Injectable } from '@nestjs/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import type { GitHubTokenProvider } from './github-token.provider.js';

/**
 * The default {@link GitHubTokenProvider}: the OAuth token the signed-in user granted, refreshed when it has
 * expired. A user who never authenticated with GitHub has none, and the tools answer unauthorized.
 *
 * @public
 */
@Injectable()
export class OAuthGitHubTokenProvider implements GitHubTokenProvider {
  @Inject()
  private readonly tokenStore!: OAuthTokenStore;

  async getToken(ctx: RunContext): Promise<string | null> {
    return (await this.tokenStore.getValidAccessToken(ctx.userId, 'github')) ?? null;
  }
}
