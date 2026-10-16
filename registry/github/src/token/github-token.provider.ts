import type { RunContext } from '@loopstack/common';

/**
 * DI token for the {@link GitHubTokenProvider} every tool in this package authenticates with.
 *
 * @public
 */
export const GITHUB_TOKEN_PROVIDER = 'GITHUB_TOKEN_PROVIDER';

/**
 * Where the tools in this package get their GitHub token.
 *
 * The default implementation reads the signed-in user's OAuth token, which is what an app with people in
 * front of it wants. A headless app has no such user: it runs on a personal access token or an app
 * installation token it keeps itself. Such an app provides its own implementation through
 * `GitHubModule.forRoot({ tokenProvider })`, and every tool picks it up.
 *
 * @public
 */
export interface GitHubTokenProvider {
  /** The token for this run, or `null` when there is none — which every tool reports as unauthorized. */
  getToken(ctx: RunContext): Promise<string | null>;
}
