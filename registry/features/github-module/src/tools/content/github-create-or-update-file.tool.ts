import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    path: z.string(),
    content: z.string(),
    message: z.string(),
    sha: z.string().optional(),
    branch: z.string().optional(),
  })
  .strict();

export type GitHubCreateOrUpdateFileArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Creates or updates a file in a GitHub repository. Content is provided as plain text and encoded to base64 before sending. To update an existing file, provide the sha of the file being replaced. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubCreateOrUpdateFileTool extends BaseTool {
  private readonly logger = new Logger(GitHubCreateOrUpdateFileTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubCreateOrUpdateFileArgs): Promise<ToolResult> {
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
      message: args.message,
      content: Buffer.from(args.content).toString('base64'),
    };

    if (args.sha) requestBody.sha = args.sha;
    if (args.branch) requestBody.branch = args.branch;

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/contents/${args.path}`;
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

    const data = (await response.json()) as {
      content: {
        name: string;
        path: string;
        sha: string;
        html_url: string;
      };
      commit: {
        sha: string;
        message: string;
      };
    };

    return {
      data: {
        file: {
          name: data.content.name,
          path: data.content.path,
          sha: data.content.sha,
          htmlUrl: data.content.html_url,
        },
        commit: {
          sha: data.commit.sha,
          message: data.commit.message,
        },
      },
    };
  }
}
