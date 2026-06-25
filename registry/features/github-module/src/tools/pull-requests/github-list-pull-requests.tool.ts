import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    state: z.enum(['open', 'closed', 'all']).default('open'),
    base: z.string().optional(),
    perPage: z.number().default(30),
    page: z.number().default(1),
  })
  .strict();

export type GitHubListPullRequestsArgs = z.input<typeof inputSchema>;

export type GitHubListPullRequestsResult = {
  pullRequests?: Array<{
    id: number;
    number: number;
    title: string;
    state: string;
    user: string;
    head: string;
    headSha: string;
    base: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
    draft: boolean;
  }>;
  error?: string;
  message?: string;
};

@Tool({
  name: 'github_list_pull_requests',
  description:
    'Lists pull requests for a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GitHubListPullRequestsTool extends BaseTool<
  GitHubListPullRequestsArgs,
  object,
  GitHubListPullRequestsResult
> {
  private readonly logger = new Logger(GitHubListPullRequestsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: GitHubListPullRequestsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubListPullRequestsResult>> {
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
      state: args.state ?? 'open',
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    if (args.base) params.set('base', args.base);

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls?${params.toString()}`;
    const response = await fetch(url, {
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

    const data = (await response.json()) as Array<{
      id: number;
      number: number;
      title: string;
      state: string;
      user: { login: string };
      head: { ref: string; sha: string };
      base: { ref: string };
      created_at: string;
      updated_at: string;
      html_url: string;
      draft: boolean;
    }>;

    const pullRequests = data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      user: pr.user.login,
      head: pr.head.ref,
      headSha: pr.head.sha,
      base: pr.base.ref,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
      draft: pr.draft,
    }));

    return {
      data: { pullRequests },
    };
  }
}
