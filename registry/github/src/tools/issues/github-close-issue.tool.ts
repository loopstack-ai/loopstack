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
    notPlanned: z.boolean().optional(),
    duplicateOf: z.number().optional(),
  })
  .strict()
  .refine((args) => args.notPlanned !== true || args.duplicateOf === undefined, {
    message: 'Provide either notPlanned or duplicateOf, not both.',
  });

/**
 * Args for `GitHubCloseIssueTool`: the repository `owner`, `repo`, `issueNumber` and an optional
 * reason, either `notPlanned` or `duplicateOf` with the number of the canonical issue.
 *
 * @public
 */
export type GitHubCloseIssueArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubCloseIssueTool`: the closed `issue` summary, or an `error`.
 *
 * @public
 */
export type GitHubCloseIssueResult =
  | {
      issue: {
        number: number;
        state: string;
        stateReason: string | null;
      };
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubCloseIssueResult}.
 *
 * @public
 */
export const GitHubCloseIssueResultSchema = z.strictObject({
  issue: z.strictObject({
    number: z.number(),
    state: z.string(),
    stateReason: z.string().nullable(),
  }),
});

/**
 * Tool that closes a GitHub issue, optionally as not planned or as a duplicate.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_close_issue',
  description:
    'Closes a GitHub issue. Without a reason the issue is closed as completed. With notPlanned it is closed as not ' +
    'planned, and with duplicateOf set to the number of another issue it is closed as a duplicate of that issue. ' +
    'Returns the issue number, its state and its state reason. ' +
    'Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  configSchema: GitHubToolConfigSchema,
  resultSchema: GitHubCloseIssueResultSchema,
  effects: 'external',
})
export class GitHubCloseIssueTool extends BaseTool<GitHubCloseIssueArgs, GitHubToolConfig, GitHubCloseIssueResult> {
  private readonly logger = new Logger(GitHubCloseIssueTool.name);

  @Inject()
  private readonly tokens!: GitHubTokenService;

  protected async handle(
    args: GitHubCloseIssueArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitHubToolConfig>,
  ): Promise<ToolEnvelope<GitHubCloseIssueResult>> {
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

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
    const issueUrl = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues`;

    let duplicateIssueId: number | undefined;

    if (args.duplicateOf !== undefined) {
      // GitHub records the duplicate relation with the canonical issue's database id, not with its number, so
      // the number the caller gave is read back as an id first.
      const duplicateResponse = await fetch(`${issueUrl}/${args.duplicateOf}`, { headers });

      if (!duplicateResponse.ok) {
        return this.failure(duplicateResponse, ctx);
      }

      duplicateIssueId = ((await duplicateResponse.json()) as { id: number }).id;
    }

    const response = await fetch(`${issueUrl}/${args.issueNumber}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        state: 'closed',
        ...(duplicateIssueId !== undefined
          ? { state_reason: 'duplicate', duplicate_issue_id: duplicateIssueId }
          : args.notPlanned
            ? { state_reason: 'not_planned' }
            : {}),
      }),
    });

    if (!response.ok) {
      return this.failure(response, ctx);
    }

    const issue = (await response.json()) as {
      number: number;
      state: string;
      state_reason?: string | null;
    };

    return {
      data: {
        issue: {
          number: issue.number,
          state: issue.state,
          stateReason: issue.state_reason ?? null,
        },
      },
    };
  }

  /** The error envelope for a failed response: a rejected token for 401 and 403, an api error otherwise. */
  private async failure(response: Response, ctx: RunContext): Promise<ToolEnvelope<GitHubCloseIssueResult>> {
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
}
