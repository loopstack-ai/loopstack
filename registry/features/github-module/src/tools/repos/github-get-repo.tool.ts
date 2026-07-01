import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
  })
  .strict();

/**
 * Args for `GitHubGetRepoTool`: the repository `owner` and `repo` name.
 *
 * @public
 */
export type GitHubGetRepoArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubGetRepoTool`: a `repo` object with id, full name, visibility,
 * description, language, default branch, stars, forks, topics and license, or an `error`.
 *
 * @public
 */
export type GitHubGetRepoResult = {
  repo?: {
    id: number;
    fullName: string;
    name: string;
    owner: string;
    ownerAvatar: string;
    private: boolean;
    htmlUrl: string;
    description: string | null;
    language: string | null;
    defaultBranch: string;
    stars: number;
    forks: number;
    openIssues: number;
    createdAt: string;
    updatedAt: string;
    topics: string[];
    license: string | null;
  };
  error?: string;
  message?: string;
};

/**
 * Tool that fetches detailed information about a single GitHub repository.
 * Takes an `owner` and `repo` and returns full repository metadata.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_get_repo',
  description:
    'Gets detailed information about a specific GitHub repository. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GitHubGetRepoTool extends BaseTool<GitHubGetRepoArgs, object, GitHubGetRepoResult> {
  private readonly logger = new Logger(GitHubGetRepoTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(args: GitHubGetRepoArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetRepoResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
        error: 'No valid GitHub token found. Please authenticate first.',
      };
    }

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`GitHub API returned ${response.status} for user ${ctx.userId}`);
      return {
        data: {
          error: '401',
          message: 'GitHub token was rejected. Please re-authenticate.',
        },
        error: 'GitHub token was rejected. Please re-authenticate.',
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
        error: `GitHub API error: ${response.statusText}`,
      };
    }

    const repo = (await response.json()) as {
      id: number;
      full_name: string;
      name: string;
      owner: { login: string; avatar_url: string };
      private: boolean;
      html_url: string;
      description: string | null;
      language: string | null;
      default_branch: string;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      created_at: string;
      updated_at: string;
      topics: string[];
      license: { spdx_id: string } | null;
    };

    return {
      data: {
        repo: {
          id: repo.id,
          fullName: repo.full_name,
          name: repo.name,
          owner: repo.owner.login,
          ownerAvatar: repo.owner.avatar_url,
          private: repo.private,
          htmlUrl: repo.html_url,
          description: repo.description,
          language: repo.language,
          defaultBranch: repo.default_branch,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          topics: repo.topics,
          license: repo.license?.spdx_id ?? null,
        },
      },
    };
  }
}
