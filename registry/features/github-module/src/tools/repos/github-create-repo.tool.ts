import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    private: z.boolean().default(false),
    autoInit: z.boolean().default(false),
  })
  .strict();

export type GitHubCreateRepoArgs = z.input<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Creates a new GitHub repository for the authenticated user. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubCreateRepoTool extends BaseTool {
  private readonly logger = new Logger(GitHubCreateRepoTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubCreateRepoArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const body: Record<string, unknown> = {
      name: args.name,
      private: args.private ?? false,
      auto_init: args.autoInit ?? false,
    };

    if (args.description) body.description = args.description;

    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

    const repo = (await response.json()) as {
      id: number;
      full_name: string;
      name: string;
      html_url: string;
      private: boolean;
      default_branch: string;
    };

    return {
      data: {
        repo: {
          id: repo.id,
          fullName: repo.full_name,
          name: repo.name,
          htmlUrl: repo.html_url,
          private: repo.private,
          defaultBranch: repo.default_branch,
        },
      },
    };
  }
}
