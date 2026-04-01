import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubGetPullRequestArgs = {
  owner: string;
  repo: string;
  pullNumber: number;
};

@Tool({
  config: {
    description:
      'Gets detailed information about a specific GitHub pull request. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubGetPullRequestTool extends BaseTool {
  private readonly logger = new Logger(GitHubGetPullRequestTool.name);

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
  args: GitHubGetPullRequestArgs;

  async run(args: GitHubGetPullRequestArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls/${args.pullNumber}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
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
      const body = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${body}`);
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
      body: string | null;
      state: string;
      user: { login: string };
      head: { ref: string; sha: string };
      base: { ref: string };
      merged: boolean;
      mergeable: boolean | null;
      draft: boolean;
      additions: number;
      deletions: number;
      changed_files: number;
      created_at: string;
      updated_at: string;
      merged_at: string | null;
      html_url: string;
      comments: number;
      review_comments: number;
    };

    return {
      data: {
        pullRequest: {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          user: pr.user.login,
          head: pr.head.ref,
          headSha: pr.head.sha,
          base: pr.base.ref,
          merged: pr.merged,
          mergeable: pr.mergeable,
          draft: pr.draft,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          mergedAt: pr.merged_at,
          htmlUrl: pr.html_url,
          comments: pr.comments,
          reviewComments: pr.review_comments,
        },
      },
    };
  }
}
