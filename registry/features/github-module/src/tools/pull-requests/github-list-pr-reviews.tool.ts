import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubListPrReviewsArgs = {
  owner: string;
  repo: string;
  pullNumber: number;
};

@Tool({
  config: {
    description:
      'Lists reviews on a GitHub pull request. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubListPrReviewsTool implements ToolInterface {
  private readonly logger = new Logger(GitHubListPrReviewsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.number(),
      })
      .strict(),
  })
  args: GitHubListPrReviewsArgs;

  async execute(args: GitHubListPrReviewsArgs, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls/${args.pullNumber}/reviews`;
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
      user: { login: string };
      body: string;
      state: string;
      submitted_at: string;
      html_url: string;
    }>;

    const reviews = data.map((review) => ({
      id: review.id,
      user: review.user.login,
      body: review.body,
      state: review.state,
      submittedAt: review.submitted_at,
      htmlUrl: review.html_url,
    }));

    return {
      data: { reviews },
    };
  }
}
