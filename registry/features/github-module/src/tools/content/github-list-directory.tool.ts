import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    path: z.string().default(''),
    ref: z.string().optional(),
  })
  .strict();

export type GitHubListDirectoryArgs = z.input<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Lists the contents of a directory in a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubListDirectoryTool extends BaseTool {
  private readonly logger = new Logger(GitHubListDirectoryTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubListDirectoryArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams();
    if (args.ref) params.set('ref', args.ref);

    const dirPath = args.path ?? '';
    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/contents/${dirPath}${params.toString() ? `?${params.toString()}` : ''}`;
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

    const data = (await response.json()) as Array<{
      name: string;
      path: string;
      sha: string;
      size: number;
      type: string;
      html_url: string;
    }>;

    const entries = data.map((entry) => ({
      name: entry.name,
      path: entry.path,
      sha: entry.sha,
      size: entry.size,
      type: entry.type,
      htmlUrl: entry.html_url,
    }));

    return {
      data: { entries },
    };
  }
}
