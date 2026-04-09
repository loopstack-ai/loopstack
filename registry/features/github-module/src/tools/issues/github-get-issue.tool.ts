import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    issueNumber: z.number(),
  })
  .strict();

export type GitHubGetIssueArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Gets detailed information about a specific GitHub issue. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubGetIssueTool extends BaseTool {
  private readonly logger = new Logger(GitHubGetIssueTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubGetIssueArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}`;
    const response = await fetch(url, {
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

    const issue = (await response.json()) as {
      id: number;
      number: number;
      title: string;
      body: string | null;
      state: string;
      user: { login: string };
      labels: Array<{ name: string }>;
      assignees: Array<{ login: string }>;
      milestone: { title: string } | null;
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      html_url: string;
      comments: number;
    };

    return {
      data: {
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          user: issue.user.login,
          labels: issue.labels.map((l) => l.name),
          assignees: issue.assignees.map((a) => a.login),
          milestone: issue.milestone?.title ?? null,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          closedAt: issue.closed_at,
          htmlUrl: issue.html_url,
          comments: issue.comments,
        },
      },
    };
  }
}
