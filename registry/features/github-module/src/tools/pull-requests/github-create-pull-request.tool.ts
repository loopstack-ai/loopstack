import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubCreatePullRequestArgs = {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
};

@Tool({
  config: {
    description:
      'Creates a new pull request in a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubCreatePullRequestTool extends BaseTool {
  private readonly logger = new Logger(GitHubCreatePullRequestTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        head: z.string(),
        base: z.string(),
        body: z.string().optional(),
        draft: z.boolean().default(false),
      })
      .strict(),
  })
  args: GitHubCreatePullRequestArgs;

  async run(args: GitHubCreatePullRequestArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const requestBody: Record<string, unknown> = {
      title: args.title,
      head: args.head,
      base: args.base,
      draft: args.draft ?? false,
    };

    if (args.body) requestBody.body = args.body;

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`GitHub API returned ${response.status} for user ${this.context.userId}`);
      return {
        data: {
          error: '401',
          message: 'GitHub token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${errorBody}`);
      return {
        data: {
          error: 'api_error',
          message: `GitHub API error: ${response.statusText}`,
        },
      };
    }

    const pr = (await response.json()) as {
      id: number;
      number: number;
      title: string;
      html_url: string;
      state: string;
      draft: boolean;
    };

    return {
      data: {
        pullRequest: {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          htmlUrl: pr.html_url,
          state: pr.state,
          draft: pr.draft,
        },
      },
    };
  }
}
