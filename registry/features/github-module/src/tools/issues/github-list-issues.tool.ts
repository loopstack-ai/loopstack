import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubListIssuesArgs = {
  owner: string;
  repo: string;
  state?: string;
  labels?: string;
  assignee?: string;
  perPage?: number;
  page?: number;
};

@Tool({
  config: {
    description:
      'Lists issues for a GitHub repository. Note: the GitHub API returns both issues and pull requests; pull requests have a pull_request key. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubListIssuesTool implements ToolInterface {
  private readonly logger = new Logger(GitHubListIssuesTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        state: z.enum(['open', 'closed', 'all']).default('open'),
        labels: z.string().optional(),
        assignee: z.string().optional(),
        perPage: z.number().default(30),
        page: z.number().default(1),
      })
      .strict(),
  })
  args: GitHubListIssuesArgs;

  async execute(args: GitHubListIssuesArgs, ctx: RunContext): Promise<ToolResult> {
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
      state: args.state ?? 'open',
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    if (args.labels) params.set('labels', args.labels);
    if (args.assignee) params.set('assignee', args.assignee);

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues?${params.toString()}`;
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
      number: number;
      title: string;
      state: string;
      user: { login: string };
      labels: Array<{ name: string }>;
      assignees: Array<{ login: string }>;
      created_at: string;
      updated_at: string;
      html_url: string;
      pull_request?: unknown;
    }>;

    const issues = data.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      user: issue.user.login,
      labels: issue.labels.map((l) => l.name),
      assignees: issue.assignees.map((a) => a.login),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      htmlUrl: issue.html_url,
      isPullRequest: !!issue.pull_request,
    }));

    return {
      data: { issues },
    };
  }
}
