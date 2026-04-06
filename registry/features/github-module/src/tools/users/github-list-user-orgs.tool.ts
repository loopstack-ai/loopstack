import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    perPage: z.number().default(30),
  })
  .strict();

export type GitHubListUserOrgsArgs = z.input<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Lists organizations for the authenticated GitHub user. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubListUserOrgsTool extends BaseTool {
  private readonly logger = new Logger(GitHubListUserOrgsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubListUserOrgsArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams({
      per_page: String(args.perPage ?? 30),
    });

    const response = await fetch(`https://api.github.com/user/orgs?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`GitHub API returned ${response.status} for user ${this.ctx.context.userId}`);
      return {
        data: {
          error: '401',
          message: 'GitHub token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `GitHub API error: ${response.statusText}`,
        },
      };
    }

    const data = (await response.json()) as Array<{
      id: number;
      login: string;
      description: string | null;
      avatar_url: string;
    }>;

    const orgs = data.map((org) => ({
      id: org.id,
      login: org.login,
      description: org.description,
      avatarUrl: org.avatar_url,
    }));

    return {
      data: { orgs },
    };
  }
}
