import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { GITHUB_TOKEN_PROVIDER } from '../../token/index.js';
import type { GitHubTokenProvider } from '../../token/index.js';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    issueNumber: z.number(),
    labels: z.array(z.string()).min(1),
  })
  .strict();

/**
 * Args for `GitHubAddIssueLabelsTool`: the repository `owner`, `repo`, `issueNumber`
 * (issue or pull request) and the `labels` to add.
 *
 * @public
 */
export type GitHubAddIssueLabelsArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubAddIssueLabelsTool`: the `labels` now on the issue, or an `error`.
 *
 * @public
 */
export type GitHubAddIssueLabelsResult = { labels: string[] } | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubAddIssueLabelsResult}.
 *
 * @public
 */
export const GitHubAddIssueLabelsResultSchema = z.strictObject({
  labels: z.array(z.string()),
});

/**
 * Tool that adds labels to a GitHub issue or pull request.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_add_issue_labels',
  description:
    'Adds one or more labels to a GitHub issue or pull request. The labels must already exist in the repository. ' +
    'Returns the names of all labels on the issue after the call. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubAddIssueLabelsResultSchema,
  effects: 'external',
})
export class GitHubAddIssueLabelsTool extends BaseTool<GitHubAddIssueLabelsArgs, object, GitHubAddIssueLabelsResult> {
  private readonly logger = new Logger(GitHubAddIssueLabelsTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER) private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(
    args: GitHubAddIssueLabelsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubAddIssueLabelsResult>> {
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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/labels`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ labels: args.labels }),
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

    // The response carries every label on the issue, not only the ones just added.
    const labels = (await response.json()) as { name: string }[];

    return {
      data: {
        labels: labels.map((label) => label.name),
      },
    };
  }
}
