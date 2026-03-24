import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubCreateIssueArgs = {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
};

@Tool({
  config: {
    description:
      'Creates a new issue in a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubCreateIssueTool implements ToolInterface {
  private readonly logger = new Logger(GitHubCreateIssueTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string().optional(),
        labels: z.array(z.string()).optional(),
        assignees: z.array(z.string()).optional(),
      })
      .strict(),
  })
  args: GitHubCreateIssueArgs;

  async execute(args: GitHubCreateIssueArgs, ctx: RunContext): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

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
    };

    if (args.body) requestBody.body = args.body;
    if (args.labels) requestBody.labels = args.labels;
    if (args.assignees) requestBody.assignees = args.assignees;

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues`;
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

    const issue = (await response.json()) as {
      id: number;
      number: number;
      title: string;
      html_url: string;
      state: string;
    };

    return {
      data: {
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          htmlUrl: issue.html_url,
          state: issue.state,
        },
      },
    };
  }
}
