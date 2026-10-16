import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { GITHUB_TOKEN_PROVIDER, type GitHubTokenProvider } from '../../token/index.js';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    issueNumber: z.number(),
    blockerNumber: z.number(),
  })
  .strict();

/**
 * Args for `GitHubAddIssueDependencyTool`: the repository `owner`, `repo`, the
 * `issueNumber` that is blocked and the `blockerNumber` that blocks it.
 *
 * @public
 */
export type GitHubAddIssueDependencyArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubAddIssueDependencyTool`: the `issueNumber` that is now blocked and
 * the `blockerNumber` that blocks it, or an `error`.
 *
 * @public
 */
export type GitHubAddIssueDependencyResult =
  | {
      issueNumber: number;
      blockerNumber: number;
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubAddIssueDependencyResult}.
 *
 * @public
 */
export const GitHubAddIssueDependencyResultSchema = z.strictObject({
  issueNumber: z.number(),
  blockerNumber: z.number(),
});

/**
 * Tool that records a GitHub issue dependency: one issue is blocked by another.
 *
 * GitHub shows the relation on both issues. The endpoint takes the blocking issue's database id, so its
 * number is resolved to that id first.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_add_issue_dependency',
  description:
    'Records that one GitHub issue is blocked by another, which GitHub shows on both issues. Returns the blocked issue number and the blocking issue number. Returns { error: "blocker_not_found" } when the blocking issue cannot be read, and { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubAddIssueDependencyResultSchema,
  effects: 'external',
})
export class GitHubAddIssueDependencyTool extends BaseTool<
  GitHubAddIssueDependencyArgs,
  object,
  GitHubAddIssueDependencyResult
> {
  private readonly logger = new Logger(GitHubAddIssueDependencyTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER)
  private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(
    args: GitHubAddIssueDependencyArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubAddIssueDependencyResult>> {
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

    const repoPath = `${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    // The dependency endpoint takes the blocking issue's database id, not its number, so the blocking issue
    // is read first to get that id.
    const blockerResponse = await fetch(`https://api.github.com/repos/${repoPath}/issues/${args.blockerNumber}`, {
      headers,
    });

    if (blockerResponse.status === 401 || blockerResponse.status === 403) {
      this.logger.warn(`GitHub API returned ${blockerResponse.status} for user ${ctx.userId}`);
      return {
        data: {
          error: '401',
          message: 'GitHub token was rejected. Please re-authenticate.',
        },
        error: 'GitHub token was rejected. Please re-authenticate.',
      };
    }

    if (!blockerResponse.ok) {
      const errorBody = await blockerResponse.text();
      this.logger.error(`GitHub API error: ${blockerResponse.status} ${errorBody}`);
      const message = `Could not read issue #${args.blockerNumber} on ${args.owner}/${args.repo}: ${blockerResponse.statusText}`;
      return { data: { error: 'blocker_not_found', message }, error: message };
    }

    const blocker = (await blockerResponse.json()) as { id: number };

    const response = await fetch(
      `https://api.github.com/repos/${repoPath}/issues/${args.issueNumber}/dependencies/blocked_by`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ issue_id: blocker.id }),
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

    return {
      data: {
        issueNumber: args.issueNumber,
        blockerNumber: args.blockerNumber,
      },
    };
  }
}
