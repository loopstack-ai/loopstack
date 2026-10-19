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
    assignees: z.array(z.string()).min(1),
  })
  .strict();

/**
 * Args for `GitHubAddIssueAssigneesTool`: the repository `owner`, `repo`, the
 * `issueNumber` (issue or pull request) and the `assignees` logins to add.
 *
 * @public
 */
export type GitHubAddIssueAssigneesArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubAddIssueAssigneesTool`: the `assignees` logins the issue carries
 * after the call, or an `error`.
 *
 * @public
 */
export type GitHubAddIssueAssigneesResult =
  | {
      issueNumber: number;
      assignees: string[];
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubAddIssueAssigneesResult}.
 *
 * @public
 */
export const GitHubAddIssueAssigneesResultSchema = z.strictObject({
  issueNumber: z.number(),
  assignees: z.array(z.string()),
});

/**
 * Tool that adds assignees to a GitHub issue or pull request.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_add_issue_assignees',
  description:
    'Adds one or more users as assignees of a GitHub issue or pull request. Returns the logins the issue carries after the call, which can be shorter than the requested list because GitHub silently drops a user who cannot be assigned to this repository. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  configSchema: GitHubToolConfigSchema,
  resultSchema: GitHubAddIssueAssigneesResultSchema,
  effects: 'external',
})
export class GitHubAddIssueAssigneesTool extends BaseTool<
  GitHubAddIssueAssigneesArgs,
  GitHubToolConfig,
  GitHubAddIssueAssigneesResult
> {
  private readonly logger = new Logger(GitHubAddIssueAssigneesTool.name);

  @Inject()
  private readonly tokens!: GitHubTokenService;

  protected async handle(
    args: GitHubAddIssueAssigneesArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitHubToolConfig>,
  ): Promise<ToolEnvelope<GitHubAddIssueAssigneesResult>> {
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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/assignees`;
    const response = await fetch(url, {
      method: 'POST',
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

    // GitHub answers with the whole issue, and its `assignees` are the logins the issue now carries. A
    // requested login that cannot be assigned to this repository is dropped without any error, so the
    // response is the only reliable account of what the call achieved.
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
