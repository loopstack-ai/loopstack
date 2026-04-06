import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    runId: z.number(),
  })
  .strict();

export type GitHubGetWorkflowRunArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Gets detailed information about a specific GitHub Actions workflow run. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubGetWorkflowRunTool extends BaseTool {
  private readonly logger = new Logger(GitHubGetWorkflowRunTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubGetWorkflowRunArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/actions/runs/${args.runId}`;
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

    const run = (await response.json()) as {
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      head_branch: string;
      head_sha: string;
      event: string;
      workflow_id: number;
      run_number: number;
      run_attempt: number;
      created_at: string;
      updated_at: string;
      run_started_at: string;
      html_url: string;
    };

    return {
      data: {
        run: {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          headBranch: run.head_branch,
          headSha: run.head_sha,
          event: run.event,
          workflowId: run.workflow_id,
          runNumber: run.run_number,
          runAttempt: run.run_attempt,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          runStartedAt: run.run_started_at,
          htmlUrl: run.html_url,
        },
      },
    };
  }
}
