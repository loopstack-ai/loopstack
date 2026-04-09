import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    query: z.string(),
    perPage: z.number().default(30),
    page: z.number().default(1),
  })
  .strict();

export type GitHubSearchCodeArgs = z.input<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Searches for code across GitHub repositories using the GitHub search syntax. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubSearchCodeTool extends BaseTool {
  private readonly logger = new Logger(GitHubSearchCodeTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubSearchCodeArgs): Promise<ToolResult> {
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
      q: args.query,
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    const response = await fetch(`https://api.github.com/search/code?${params.toString()}`, {
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

    const data = (await response.json()) as {
      total_count: number;
      items: Array<{
        name: string;
        path: string;
        sha: string;
        html_url: string;
        repository: { full_name: string };
      }>;
    };

    const results = data.items.map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      htmlUrl: item.html_url,
      repository: item.repository.full_name,
    }));

    return {
      data: { totalCount: data.total_count, results },
    };
  }
}
