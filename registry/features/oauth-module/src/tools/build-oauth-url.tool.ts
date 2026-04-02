import { Inject } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthProviderRegistry } from '../services';

export type BuildOAuthUrlArgs = {
  provider: string;
  scopes: string[];
};

export interface BuildOAuthUrlResult {
  authUrl: string;
  state: string;
}

@Tool({
  config: {
    description: 'Builds an OAuth 2.0 authorization URL for the given provider with CSRF state parameter.',
  },
})
export class BuildOAuthUrlTool extends BaseTool {
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

  run(args: BuildOAuthUrlArgs): Promise<ToolResult<BuildOAuthUrlResult>> {
    const provider = this.providerRegistry.get(args.provider);
    const state = randomBytes(32).toString('hex');
    const scopes = args.scopes?.length ? args.scopes : provider.defaultScopes;
    const authUrl = provider.buildAuthUrl(scopes, state);

    return Promise.resolve({
      data: { authUrl, state },
    });
  }
}
