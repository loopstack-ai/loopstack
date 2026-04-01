import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubGetFileContentArgs = {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
};

@Tool({
  config: {
    description:
      'Gets the content of a file from a GitHub repository. Decodes base64-encoded content from the API. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubGetFileContentTool extends BaseTool {
  private readonly logger = new Logger(GitHubGetFileContentTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        ref: z.string().optional(),
      })
      .strict(),
  })
  args: GitHubGetFileContentArgs;

  async run(args: GitHubGetFileContentArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'github');

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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/contents/${args.path}${params.toString() ? `?${params.toString()}` : ''}`;
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
      name: string;
      path: string;
      sha: string;
      size: number;
      type: string;
      content?: string;
      encoding?: string;
      html_url: string;
    };

    let content: string | null = null;
    if (data.content && data.encoding === 'base64') {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return {
      data: {
        file: {
          name: data.name,
          path: data.path,
          sha: data.sha,
          size: data.size,
          type: data.type,
          content,
          htmlUrl: data.html_url,
        },
      },
    };
  }
}
