import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    visibility: z.enum(['all', 'public', 'private']).default('all'),
    sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
    perPage: z.number().default(30),
    page: z.number().default(1),
  })
  .strict();

export type GitHubListReposArgs = z.input<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Lists repositories for the authenticated GitHub user. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubListReposTool extends BaseTool {
  private readonly logger = new Logger(GitHubListReposTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubListReposArgs): Promise<ToolResult> {
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
      visibility: args.visibility ?? 'all',
      sort: args.sort ?? 'updated',
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    const response = await fetch(`https://api.github.com/user/repos?${params.toString()}`, {
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
      full_name: string;
      name: string;
      owner: { login: string };
      private: boolean;
      html_url: string;
      description: string | null;
      language: string | null;
      default_branch: string;
      updated_at: string;
    }>;

    const repos = data.map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description,
      language: repo.language,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
    }));

    return {
      data: { repos },
    };
  }
}
