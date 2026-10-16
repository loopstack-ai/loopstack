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
    assignees: z.array(z.string()).min(1),
  })
  .strict();

/**
 * Args for `GitHubRemoveIssueAssigneesTool`: the repository `owner`, `repo`, the
 * `issueNumber` (issue or pull request) and the `assignees` logins to remove.
 *
 * @public
 */
export type GitHubRemoveIssueAssigneesArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubRemoveIssueAssigneesTool`: the `assignees` logins the issue still
 * carries after the call, or an `error`.
 *
 * @public
 */
export type GitHubRemoveIssueAssigneesResult =
  | {
      issueNumber: number;
      assignees: string[];
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubRemoveIssueAssigneesResult}.
 *
 * @public
 */
export const GitHubRemoveIssueAssigneesResultSchema = z.strictObject({
  issueNumber: z.number(),
  assignees: z.array(z.string()),
});

/**
 * Tool that removes assignees from a GitHub issue or pull request.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_remove_issue_assignees',
  description:
    'Removes one or more users from the assignees of a GitHub issue or pull request. Returns the logins the issue still carries after the call, so a caller can confirm the issue is now unassigned. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubRemoveIssueAssigneesResultSchema,
  effects: 'external',
})
export class GitHubRemoveIssueAssigneesTool extends BaseTool<
  GitHubRemoveIssueAssigneesArgs,
  object,
  GitHubRemoveIssueAssigneesResult
> {
  private readonly logger = new Logger(GitHubRemoveIssueAssigneesTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER)
  private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(
    args: GitHubRemoveIssueAssigneesArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubRemoveIssueAssigneesResult>> {
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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/assignees`;
    // The logins to remove go in the body of the DELETE, not in the path.
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignees: args.assignees }),
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

    // GitHub answers with the whole issue. A login that was not assigned is accepted without any error, so
    // the remaining `assignees` are the only account of what the issue carries now.
    const issue = (await response.json()) as {
      number: number;
      assignees?: { login?: string }[] | null;
    };

    return {
      data: {
        issueNumber: issue.number,
        assignees: (issue.assignees ?? []).map((user) => user.login ?? '').filter(Boolean),
      },
    };
  }
}
