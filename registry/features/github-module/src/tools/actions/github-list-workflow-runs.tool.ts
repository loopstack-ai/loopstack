import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubListWorkflowRunsArgs = {
  owner: string;
  repo: string;
  branch?: string;
  status?: string;
  perPage?: number;
  page?: number;
};

@Tool({
  config: {
    description:
      'Lists workflow runs for a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubListWorkflowRunsTool extends BaseTool {
  private readonly logger = new Logger(GitHubListWorkflowRunsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string().optional(),
        status: z
          .enum([
            'completed',
            'action_required',
            'cancelled',
            'failure',
            'neutral',
            'skipped',
            'stale',
            'success',
            'timed_out',
            'in_progress',
            'queued',
            'requested',
            'waiting',
            'pending',
          ])
          .optional(),
        perPage: z.number().default(30),
        page: z.number().default(1),
      })
      .strict(),
  })
  args: GitHubListWorkflowRunsArgs;

  async run(args: GitHubListWorkflowRunsArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams({
      per_page: String(args.perPage ?? 30),
      page: String(args.page ?? 1),
    });

    if (args.branch) params.set('branch', args.branch);
    if (args.status) params.set('status', args.status);

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/actions/runs?${params.toString()}`;
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

    const data = (await response.json()) as {
      total_count: number;
      workflow_runs: Array<{
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        head_branch: string;
        head_sha: string;
        event: string;
        created_at: string;
        updated_at: string;
        html_url: string;
      }>;
    };

    const runs = data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      headBranch: run.head_branch,
      headSha: run.head_sha,
      event: run.event,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      htmlUrl: run.html_url,
    }));

    return {
      data: { totalCount: data.total_count, runs },
    };
  }
}
