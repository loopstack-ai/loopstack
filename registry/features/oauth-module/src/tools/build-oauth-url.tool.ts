import { Inject } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthProviderRegistry } from '../services';

const BuildOAuthUrlSchema = z
  .object({
    provider: z.string(),
    scopes: z.array(z.string()),
  })
  .strict();

type BuildOAuthUrlArgs = z.infer<typeof BuildOAuthUrlSchema>;

export interface BuildOAuthUrlResult {
  authUrl: string;
  state: string;
}

@Tool({
  uiConfig: {
    description: 'Builds an OAuth 2.0 authorization URL for the given provider with CSRF state parameter.',
  },
  schema: BuildOAuthUrlSchema,
})
export class BuildOAuthUrlTool extends BaseTool {
  @Inject()
  private providerRegistry: OAuthProviderRegistry;

  call(args: BuildOAuthUrlArgs): Promise<ToolResult> {
    const provider = this.providerRegistry.get(args.provider);
    const state = randomBytes(32).toString('hex');
    const scopes = args.scopes?.length ? args.scopes : provider.defaultScopes;
    const authUrl = provider.buildAuthUrl(scopes, state);

    return Promise.resolve({
      data: { authUrl, state },
    });
  }
}
