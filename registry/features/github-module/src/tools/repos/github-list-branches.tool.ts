import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GitHubListBranchesArgs = {
  owner: string;
  repo: string;
  perPage?: number;
};

@Tool({
  config: {
    description:
      'Lists branches for a GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubListBranchesTool extends BaseTool {
  private readonly logger = new Logger(GitHubListBranchesTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        owner: z.string(),
        repo: z.string(),
        perPage: z.number().default(30),
      })
      .strict(),
  })
  args: GitHubListBranchesArgs;

  async run(args: GitHubListBranchesArgs): Promise<ToolResult> {
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
    });

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/branches?${params.toString()}`;
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

    const data = (await response.json()) as Array<{
      name: string;
      commit: { sha: string };
      protected: boolean;
    }>;

    const branches = data.map((branch) => ({
      name: branch.name,
      commitSha: branch.commit.sha,
      protected: branch['protected'],
    }));

    return {
      data: { branches },
    };
  }
}
