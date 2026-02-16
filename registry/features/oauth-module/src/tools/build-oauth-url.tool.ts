import { Inject } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthProviderRegistry } from '../services';

export type BuildOAuthUrlArgs = {
  provider: string;
  scopes: string[];
};

@Tool({
  config: {
    description: 'Builds an OAuth 2.0 authorization URL for the given provider with CSRF state parameter.',
  },
})
export class BuildOAuthUrlTool implements ToolInterface {
  @Inject()
  private providerRegistry: OAuthProviderRegistry;

  @Input({
    schema: z
      .object({
        provider: z.string(),
        scopes: z.array(z.string()),
      })
      .strict(),
  })
  args: BuildOAuthUrlArgs;

  execute(args: BuildOAuthUrlArgs): ToolResult {
    const provider = this.providerRegistry.get(args.provider);
    const state = randomBytes(32).toString('hex');
    const scopes = args.scopes?.length ? args.scopes : provider.defaultScopes;
    const authUrl = provider.buildAuthUrl(scopes, state);

    return {
      data: { authUrl, state },
    };
  }
}
