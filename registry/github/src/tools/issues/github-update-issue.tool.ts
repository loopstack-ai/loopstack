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
    title: z.string().optional(),
    body: z.string().optional(),
    type: z.string().optional(),
  })
  .strict()
  .refine((args) => args.title !== undefined || args.body !== undefined || args.type !== undefined, {
    message: 'Provide at least one of title, body or type.',
  });

/**
 * Args for `GitHubUpdateIssueTool`: the repository `owner`, `repo`, `issueNumber` and at least
 * one of the new `title`, the new `body` and the issue `type`.
 *
 * @public
 */
export type GitHubUpdateIssueArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubUpdateIssueTool`: the updated `issue` summary, or an `error`.
 *
 * @public
 */
export type GitHubUpdateIssueResult =
  | {
      issue: {
        number: number;
        title: string;
        htmlUrl: string;
      };
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubUpdateIssueResult}.
 *
 * @public
 */
export const GitHubUpdateIssueResultSchema = z.strictObject({
  issue: z.strictObject({
    number: z.number(),
    title: z.string(),
    htmlUrl: z.string(),
  }),
});

/**
 * Tool that updates the title, the body or the issue type of a GitHub issue.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_update_issue',
  description:
    'Updates a GitHub issue. Takes any combination of a new title, a new body and an issue type, and leaves the ' +
    'fields that are not given as they are. The type is the issue type the organization defines, for example "Bug" ' +
    'or "Task". Returns the issue number, its title and its html url. ' +
    'Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubUpdateIssueResultSchema,
  effects: 'external',
})
export class GitHubUpdateIssueTool extends BaseTool<GitHubUpdateIssueArgs, object, GitHubUpdateIssueResult> {
  private readonly logger = new Logger(GitHubUpdateIssueTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER) private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(args: GitHubUpdateIssueArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubUpdateIssueResult>> {
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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.body !== undefined ? { body: args.body } : {}),
        ...(args.type !== undefined ? { type: args.type } : {}),
      }),
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

    const issue = (await response.json()) as {
      number: number;
      title: string;
      html_url: string;
    };

    return {
      data: {
        issue: {
          number: issue.number,
          title: issue.title,
          htmlUrl: issue.html_url,
        },
      },
    };
  }
}
