import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number(),
    mergeMethod: z.enum(['merge', 'squash', 'rebase']).default('merge'),
    commitTitle: z.string().optional(),
    commitMessage: z.string().optional(),
  })
  .strict();

export type GitHubMergePullRequestArgs = z.input<typeof inputSchema>;

@Tool({
  uiConfig: {
    description: 'Merges a GitHub pull request. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubMergePullRequestTool extends BaseTool {
  private readonly logger = new Logger(GitHubMergePullRequestTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubMergePullRequestArgs): Promise<ToolResult> {
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
      merge_method: args.mergeMethod ?? 'merge',
    };

    if (args.commitTitle) requestBody.commit_title = args.commitTitle;
    if (args.commitMessage) requestBody.commit_message = args.commitMessage;

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls/${args.pullNumber}/merge`;
    const response = await fetch(url, {
      method: 'PUT',
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

    const result = (await response.json()) as {
      sha: string;
      merged: boolean;
      message: string;
    };

    return {
      data: {
        merge: {
          sha: result.sha,
          merged: result.merged,
          message: result.message,
        },
      },
    };
  }
}
