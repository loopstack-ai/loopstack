import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { SecretService } from '@loopstack/secrets';

/**
 * DI token for the default credential source of the git tools, set once with `GitModule.forRoot()`.
 *
 * @public
 */
export const GIT_TOKEN_SOURCE = 'GIT_TOKEN_SOURCE';

/**
 * Where a git tool gets the token for one call. Every field is a **name**, never a token: the name is what
 * the author knows at the call site, and what is safe to keep in the run trace.
 *
 * - `tokenEnv` — an environment variable of the machine the app runs on. The right source for a headless app
 *   running on a personal access token.
 * - `tokenSecret` — a secret of the workspace the run belongs to. The right source where each workspace
 *   pushes with its own credential.
 * - `oauthProvider` — the OAuth provider whose token belongs to the person the run belongs to, such as
 *   `github`. The right source for an app with people in front of it, where the token says who is acting.
 *
 * The first one set wins, in that order, and what the module was registered with fills in whatever the call
 * leaves out. With none of them set the command runs without a credential, which is all a public repository
 * or an already-authenticated remote needs.
 *
 * @public
 */
export const GitToolConfigSchema = z.object({
  tokenEnv: z.string().optional(),
  tokenSecret: z.string().optional(),
  oauthProvider: z.string().optional(),
});

/**
 * Config type for the git tools that need a credential — see {@link GitToolConfigSchema}.
 *
 * @public
 */
export type GitToolConfig = z.infer<typeof GitToolConfigSchema>;

/**
 * Where the git tools get the token they push, pull and fetch with.
 *
 * A credential is config rather than an argument on purpose. Arguments are the model-facing input of a tool
 * and are kept in the run trace, so a token passed as one is written to the database; config carries the
 * name of a source instead, and the value is read here, at the moment of the call, and handed straight to
 * the remote server, which applies it through a throwaway `GIT_ASKPASS`.
 *
 * @public
 */
@Injectable()
export class GitTokenService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly secrets?: SecretService,
    @Optional() private readonly tokenStore?: OAuthTokenStore,
    @Optional() @Inject(GIT_TOKEN_SOURCE) private readonly moduleSource?: GitToolConfig,
  ) {}

  /** The token for this call, or `undefined` when no source is named or the named source holds nothing. */
  async resolve(ctx: RunContext, options?: ToolCallOptions<GitToolConfig>): Promise<string | undefined> {
    const source: GitToolConfig = { ...this.moduleSource, ...options?.config };

    if (source.tokenEnv) return this.config.get<string>(source.tokenEnv) ?? undefined;

    if (source.tokenSecret) {
      if (!this.secrets) throw new Error('`tokenSecret` needs SecretsModule: import it or name `tokenEnv`.');
      const secrets = await this.secrets.resolveEnvMap(ctx.workspaceId);
      return secrets[source.tokenSecret] ?? undefined;
    }

    if (source.oauthProvider) {
      if (!this.tokenStore) throw new Error('`oauthProvider` needs OAuthModule: import it or name `tokenEnv`.');
      return (await this.tokenStore.getValidAccessToken(ctx.userId, source.oauthProvider)) ?? undefined;
    }

    return undefined;
  }
}
