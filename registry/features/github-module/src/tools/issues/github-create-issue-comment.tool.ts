import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    issueNumber: z.number(),
    body: z.string(),
  })
  .strict();

export type GitHubCreateIssueCommentArgs = z.infer<typeof inputSchema>;

export type GitHubCreateIssueCommentResult =
  | {
      comment: {
        id: number;
        htmlUrl: string;
        createdAt: string;
        user: string;
      };
    }
  | { error: string; message: string };

@Tool({
  name: 'github_create_issue_comment',
  description:
    'Creates a comment on a GitHub issue or pull request. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GitHubCreateIssueCommentTool extends BaseTool<
  GitHubCreateIssueCommentArgs,
  object,
  GitHubCreateIssueCommentResult
> {
  private readonly logger = new Logger(GitHubCreateIssueCommentTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: GitHubCreateIssueCommentArgs,
    ctx: RunContext,
  ): Promise<ToolResult<GitHubCreateIssueCommentResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/comments`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: args.body }),
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
      const errorBody = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${errorBody}`);
      return {
        data: {
          error: 'api_error',
          message: `GitHub API error: ${response.statusText}`,
        },
      };
    }

    const comment = (await response.json()) as {
      id: number;
      html_url: string;
      created_at: string;
      user: { login: string };
    };

    return {
      data: {
        comment: {
          id: comment.id,
          htmlUrl: comment.html_url,
          createdAt: comment.created_at,
          user: comment.user.login,
        },
      },
    };
  }
}
