import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';

/**
 * DI token for the name of the environment variable the tools read their GitHub token from, set once with
 * `GitHubModule.forRoot({ tokenEnv })`.
 *
 * @public
 */
export const GITHUB_TOKEN_ENV = 'GITHUB_TOKEN_ENV';

/**
 * The config every tool in this package accepts.
 *
 * `tokenEnv` names the environment variable to read the token from for that one call. It is set by the author
 * at the call site, never by a model, which is why it is config rather than an argument. Use it where a single
 * operation needs a different credential from the rest of the app, such as a token allowed to create
 * repositories.
 *
 * @public
 */
export const GitHubToolConfigSchema = z.object({
  tokenEnv: z.string().optional(),
});

/**
 * Config type for every tool in this package — see {@link GitHubToolConfigSchema}.
 *
 * @public
 */
export type GitHubToolConfig = z.infer<typeof GitHubToolConfigSchema>;

/**
 * Where the tools in this package get their GitHub token, in this order: the environment variable the call
 * names, the one the module names, and otherwise the OAuth token of the person the run belongs to.
 *
 * An environment variable is the right source for a token that belongs to the machine: a headless app running
 * on a personal access token names it once at registration. The OAuth token is the right source for an app
 * with people in front of it, where the token says who is acting.
 *
 * @public
 */
@Injectable()
export class GitHubTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly tokenStore: OAuthTokenStore,
    @Optional() @Inject(GITHUB_TOKEN_ENV) private readonly moduleTokenEnv?: string,
  ) {}

  /** The token for this call, or `null` when there is none — which every tool reports as unauthorized. */
  async resolve(ctx: RunContext, options?: ToolCallOptions<GitHubToolConfig>): Promise<string | null> {
    const named = options?.config?.tokenEnv ?? this.moduleTokenEnv;
    if (named) return this.config.get<string>(named) ?? null;
    return (await this.tokenStore.getValidAccessToken(ctx.userId, 'github')) ?? null;
  }
}
