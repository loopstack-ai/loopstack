import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    ref: z.string(),
  })
  .strict();

export type GitHubGetCommitArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Gets detailed information about a specific commit in a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GitHubGetCommitTool extends BaseTool {
  private readonly logger = new Logger(GitHubGetCommitTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GitHubGetCommitArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/commits/${encodeURIComponent(args.ref)}`;
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

    const data = (await response.json()) as {
      sha: string;
      commit: {
        message: string;
        author: { name: string; email: string; date: string };
        committer: { name: string; email: string; date: string };
      };
      author: { login: string } | null;
      html_url: string;
      stats: { additions: number; deletions: number; total: number };
      files: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        changes: number;
      }>;
    };

    return {
      data: {
        commit: {
          sha: data.sha,
          message: data.commit.message,
          author: {
            name: data.commit.author.name,
            email: data.commit.author.email,
            date: data.commit.author.date,
            login: data.author?.login ?? null,
          },
          committer: {
            name: data.commit.committer.name,
            date: data.commit.committer.date,
          },
          htmlUrl: data.html_url,
          stats: data.stats,
          files: data.files.map((f) => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
          })),
        },
      },
    };
  }
}
