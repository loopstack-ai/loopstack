import { Inject } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { OAuthProviderRegistry } from '../services/index.js';

/**
 * Zod schema for `BuildOAuthUrlTool` args.
 *
 * @public
 */
export const BuildOAuthUrlSchema = z
  .object({
    provider: z.string(),
    scopes: z.array(z.string()),
  })
  .strict();

/**
 * Args for `BuildOAuthUrlTool`.
 *
 * @public
 */
export type BuildOAuthUrlArgs = z.infer<typeof BuildOAuthUrlSchema>;

/**
 * Result for `BuildOAuthUrlTool`.
 *
 * @public
 */
export interface BuildOAuthUrlResult {
  authUrl: string;
  state: string;
}

/**
 * Tool that builds an OAuth 2.0 authorization URL for a provider, including a CSRF state parameter.
 *
 * @providedBy OAuthModule
 * @public
 */
@Tool({
  name: 'build_oauth_url',
  description: 'Builds an OAuth 2.0 authorization URL for the given provider with CSRF state parameter.',
  schema: BuildOAuthUrlSchema,
})
export class BuildOAuthUrlTool extends BaseTool<BuildOAuthUrlArgs, object, BuildOAuthUrlResult> {
  @Inject()
  private providerRegistry: OAuthProviderRegistry;

  protected async handle(args: BuildOAuthUrlArgs): Promise<ToolEnvelope<BuildOAuthUrlResult>> {
    const provider = this.providerRegistry.get(args.provider);
    const state = randomBytes(32).toString('hex');
    const scopes = args.scopes?.length ? args.scopes : provider.defaultScopes;
    const authUrl = provider.buildAuthUrl(scopes, state);

    return Promise.resolve({
      data: { authUrl, state },
    });
  }
}
