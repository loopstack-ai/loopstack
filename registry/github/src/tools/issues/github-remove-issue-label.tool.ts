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
    label: z.string(),
  })
  .strict();

/**
 * Args for `GitHubRemoveIssueLabelTool`: the repository `owner`, `repo`, `issueNumber`
 * (issue or pull request) and the `label` to remove.
 *
 * @public
 */
export type GitHubRemoveIssueLabelArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubRemoveIssueLabelTool`: the `label` and whether it was `removed`, or an `error`.
 *
 * @public
 */
export type GitHubRemoveIssueLabelResult =
  | {
      label: string;
      removed: boolean;
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubRemoveIssueLabelResult}.
 *
 * @public
 */
export const GitHubRemoveIssueLabelResultSchema = z.strictObject({
  label: z.string(),
  removed: z.boolean(),
});

/**
 * Tool that removes one label from a GitHub issue or pull request.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_remove_issue_label',
  description:
    'Removes one label from a GitHub issue or pull request. Returns removed: true when the label was on the issue ' +
    'and removed: false when it was not set, which is not treated as a failure. ' +
    'Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubRemoveIssueLabelResultSchema,
  effects: 'external',
})
export class GitHubRemoveIssueLabelTool extends BaseTool<
  GitHubRemoveIssueLabelArgs,
  object,
  GitHubRemoveIssueLabelResult
> {
  private readonly logger = new Logger(GitHubRemoveIssueLabelTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER) private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(
    args: GitHubRemoveIssueLabelArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubRemoveIssueLabelResult>> {
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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/labels/${encodeURIComponent(args.label)}`;
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

    // GitHub answers 404 when the label is not on the issue. The caller asked for the label to be gone, and it
    // is gone, so this is reported as removed: false instead of an error.
    if (response.status === 404) {
      return {
        data: {
          label: args.label,
          removed: false,
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
        error: `GitHub API error: ${response.statusText}`,
      };
    }

    return {
      data: {
        label: args.label,
        removed: true,
      },
    };
  }
}
