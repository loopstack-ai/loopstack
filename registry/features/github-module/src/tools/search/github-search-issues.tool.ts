import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    query: z.string(),
    sort: z
      .enum(['comments', 'reactions', 'reactions-+1', 'reactions--1', 'interactions', 'created', 'updated'])
      .optional(),
    perPage: z.number().default(30),
    page: z.number().default(1),
  })
  .strict();

export type GitHubSearchIssuesArgs = z.input<typeof inputSchema>;

export type GitHubSearchIssuesResult =
  | {
      totalCount: number;
      results: Array<{
        id: number;
        number: number;
        title: string;
        state: string;
        user: string;
        htmlUrl: string;
        createdAt: string;
        updatedAt: string;
        isPullRequest: boolean;
      }>;
    }
  | { error: string; message: string };

@Tool({
  name: 'github_search_issues',
  description:
    'Searches for issues and pull requests across GitHub using the GitHub search syntax. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GitHubSearchIssuesTool extends BaseTool<GitHubSearchIssuesArgs, object, GitHubSearchIssuesResult> {
  private readonly logger = new Logger(GitHubSearchIssuesTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: GitHubSearchIssuesArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubSearchIssuesResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
        error: 'No valid GitHub token found. Please authenticate first.',
      };
    }

    const params = new URLSearchParams({
      q: args.query,
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    if (args.sort) params.set('sort', args.sort);

    const response = await fetch(`https://api.github.com/search/issues?${params.toString()}`, {
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
        error: 'GitHub token was rejected. Please re-authenticate.',
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
        error: `GitHub API error: ${response.statusText}`,
      };
    }

    const data = (await response.json()) as {
      total_count: number;
      items: Array<{
        id: number;
        number: number;
        title: string;
        state: string;
        user: { login: string };
        html_url: string;
        repository_url: string;
        created_at: string;
        updated_at: string;
        pull_request?: unknown;
      }>;
    };

    const results = data.items.map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state,
      user: item.user.login,
      htmlUrl: item.html_url,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isPullRequest: !!item.pull_request,
    }));

    return {
      data: { totalCount: data.total_count, results },
    };
  }
}
