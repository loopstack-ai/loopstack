import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { GitHubTokenService, type GitHubToolConfig, GitHubToolConfigSchema } from '../../token/index.js';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    issueNumber: z.number(),
  })
  .strict();

/**
 * Args for `GitHubListIssueCommentsTool`: the repository `owner`, `repo` and the
 * `issueNumber` (issue or pull request) to read the comments of.
 *
 * @public
 */
export type GitHubListIssueCommentsArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubListIssueCommentsTool`: the `comments` on the issue, oldest first,
 * each with its `id`, author `user`, `createdAt` time and `body`, or an `error`.
 *
 * @public
 */
export type GitHubListIssueCommentsResult =
  | {
      comments: Array<{
        id: number;
        user: string;
        createdAt: string;
        body: string;
      }>;
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubListIssueCommentsResult}.
 *
 * @public
 */
export const GitHubListIssueCommentsResultSchema = z.strictObject({
  comments: z.array(
    z.strictObject({
      id: z.number(),
      user: z.string(),
      createdAt: z.string(),
      body: z.string(),
    }),
  ),
});

/**
 * Tool that reads the comments on a GitHub issue or pull request, oldest first.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_list_issue_comments',
  description:
    'Reads up to 100 comments on a GitHub issue or pull request, oldest first. Each entry carries the comment id, the author login, the creation time and the comment body. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  configSchema: GitHubToolConfigSchema,
  resultSchema: GitHubListIssueCommentsResultSchema,
  effects: 'none',
})
export class GitHubListIssueCommentsTool extends BaseTool<
  GitHubListIssueCommentsArgs,
  GitHubToolConfig,
  GitHubListIssueCommentsResult
> {
  private readonly logger = new Logger(GitHubListIssueCommentsTool.name);

  @Inject()
  private readonly tokens!: GitHubTokenService;

  protected async handle(
    args: GitHubListIssueCommentsArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitHubToolConfig>,
  ): Promise<ToolEnvelope<GitHubListIssueCommentsResult>> {
    const accessToken = await this.tokens.resolve(ctx, options);

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
        error: 'No valid GitHub token found. Please authenticate first.',
      };
    }

    // GitHub returns issue comments oldest first, which is the order a reader needs to follow a thread.
    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/comments?per_page=100`;
    const response = await fetch(url, {
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

    const items = (await response.json()) as Array<{
      id: number;
      user?: { login?: string } | null;
      created_at: string;
      body?: string | null;
    }>;

    return {
      data: {
        comments: items.map((item) => ({
          id: item.id,
          // A comment written by a deleted account has no user, and an empty comment has no body.
          user: item.user?.login ?? '',
          createdAt: item.created_at,
          body: item.body ?? '',
        })),
      },
    };
  }
}
