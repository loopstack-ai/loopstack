import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubSearchReposArgs = {
  query: string;
  sort?: string;
  perPage?: number;
  page?: number;
};

@Tool({
  config: {
    description:
      'Searches for repositories on GitHub using the GitHub search syntax. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubSearchReposTool implements ToolInterface {
  private readonly logger = new Logger(GitHubSearchReposTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        query: z.string(),
        sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional(),
        perPage: z.number().default(30),
        page: z.number().default(1),
      })
      .strict(),
  })
  args: GitHubSearchReposArgs;

  async execute(args: GitHubSearchReposArgs, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams({
      q: args.query,
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    if (args.sort) params.set('sort', args.sort);

    const response = await fetch(`https://api.github.com/search/repositories?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`GitHub API returned ${response.status} for user ${ctx.userId}`);
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

    const data = (await response.json()) as {
      total_count: number;
      items: Array<{
        id: number;
        full_name: string;
        description: string | null;
        html_url: string;
        language: string | null;
        stargazers_count: number;
        forks_count: number;
        updated_at: string;
      }>;
    };

    const results = data.items.map((item) => ({
      id: item.id,
      fullName: item.full_name,
      description: item.description,
      htmlUrl: item.html_url,
      language: item.language,
      stars: item.stargazers_count,
      forks: item.forks_count,
      updatedAt: item.updated_at,
    }));

    return {
      data: { totalCount: data.total_count, results },
    };
  }
}
