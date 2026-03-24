import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubTriggerWorkflowArgs = {
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  inputs?: Record<string, string>;
};

@Tool({
  config: {
    description:
      'Triggers a GitHub Actions workflow dispatch event. Returns 204 No Content on success. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubTriggerWorkflowTool implements ToolInterface {
  private readonly logger = new Logger(GitHubTriggerWorkflowTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        workflowId: z.string(),
        ref: z.string(),
        inputs: z.record(z.string(), z.string()).optional(),
      })
      .strict(),
  })
  args: GitHubTriggerWorkflowArgs;

  async execute(args: GitHubTriggerWorkflowArgs, ctx: RunContext): Promise<ToolResult> {
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
      ref: args.ref,
    };

    if (args.inputs) requestBody.inputs = args.inputs;

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/actions/workflows/${encodeURIComponent(args.workflowId)}/dispatches`;
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

    if (!response.ok && response.status !== 204) {
      const body = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `GitHub API error: ${response.statusText}`,
        },
      };
    }

    return {
      data: {
        triggered: true,
        message: 'Workflow dispatch event triggered successfully.',
      },
    };
  }
}
