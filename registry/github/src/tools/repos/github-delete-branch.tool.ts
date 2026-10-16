import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { GITHUB_TOKEN_PROVIDER, type GitHubTokenProvider } from '../../token/index.js';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string(),
  })
  .strict();

/**
 * Args for `GitHubDeleteBranchTool`: the repository `owner`, `repo` and the `branch`
 * name to delete, without the `refs/heads/` prefix.
 *
 * @public
 */
export type GitHubDeleteBranchArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubDeleteBranchTool`: the `branch` name and `deleted`, which is `false`
 * when the branch did not exist, or an `error`.
 *
 * @public
 */
export type GitHubDeleteBranchResult =
  | {
      branch: string;
      deleted: boolean;
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubDeleteBranchResult}.
 *
 * @public
 */
export const GitHubDeleteBranchResultSchema = z.strictObject({
  branch: z.string(),
  deleted: z.boolean(),
});

/**
 * Tool that deletes a branch from a GitHub repository.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_delete_branch',
  description:
    'Deletes a branch from a GitHub repository. A branch that does not exist is reported as a success with deleted: false, because the caller wanted the branch gone and it is gone. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubDeleteBranchResultSchema,
  effects: 'external',
})
export class GitHubDeleteBranchTool extends BaseTool<GitHubDeleteBranchArgs, object, GitHubDeleteBranchResult> {
  private readonly logger = new Logger(GitHubDeleteBranchTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER)
  private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(
    args: GitHubDeleteBranchArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubDeleteBranchResult>> {
    const accessToken = await this.tokenProvider.getToken(ctx);

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
        error: 'No valid GitHub token found. Please authenticate first.',
      };
    }

    // A branch name may contain slashes, and those slashes are part of the ref path. Each segment is encoded
    // on its own so the slashes stay as separators.
    const branchPath = args.branch.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/git/refs/heads/${branchPath}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

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

    // A branch that is already gone answers 422. The caller asked for the branch to be absent and it is
    // absent, so this is a success with `deleted: false` rather than an error.
    if (response.status === 422) {
      return { data: { branch: args.branch, deleted: false } };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${errorBody}`);
      return {
        data: {
          error: 'api_error',
          message: `GitHub API error: ${response.statusText}`,
        },
        error: `GitHub API error: ${response.statusText}`,
      };
    }

    return { data: { branch: args.branch, deleted: true } };
  }
}
