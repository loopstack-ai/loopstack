import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    workflowId: z.string(),
    ref: z.string(),
    inputs: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type GitHubTriggerWorkflowArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Triggers a GitHub Actions workflow dispatch event. Returns 204 No Content on success. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubTriggerWorkflowTool extends BaseTool {
  private readonly logger = new Logger(GitHubTriggerWorkflowTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubTriggerWorkflowArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

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
      this.logger.warn(`GitHub API returned ${response.status} for user ${this.ctx.context.userId}`);
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
