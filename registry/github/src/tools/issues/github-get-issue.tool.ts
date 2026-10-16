import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { GITHUB_TOKEN_PROVIDER, type GitHubTokenProvider } from '../../token/index.js';
import { type RestIssueFieldValue, issueFieldValues } from './issue-field-values.js';

const inputSchema = z
  .object({
    owner: z.string(),
    repo: z.string(),
    issueNumber: z.number(),
  })
  .strict();

/**
 * Args for `GitHubGetIssueTool`: the repository `owner`, `repo` and `issueNumber`.
 *
 * @public
 */
export type GitHubGetIssueArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubGetIssueTool`: an `issue` object with title, body, state, labels,
 * assignees and timestamps, or an `error`.
 *
 * @public
 */
export type GitHubGetIssueResult =
  | {
      issue: {
        id: number;
        number: number;
        title: string;
        body: string | null;
        state: string;
        user: string;
        labels: string[];
        assignees: string[];
        milestone: string | null;
        createdAt: string;
        updatedAt: string;
        closedAt: string | null;
        htmlUrl: string;
        comments: number;
        /** The organization's issue field values, by field name, a single select as its option name. */
        fields: Record<string, string>;
        /** GitHub's own issue type, as the organization names it, or `null` when the issue carries none. */
        type: string | null;
      };
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubGetIssueResult}.
 *
 * @public
 */
export const GitHubGetIssueResultSchema = z.strictObject({
  issue: z.strictObject({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    user: z.string(),
    labels: z.array(z.string()),
    assignees: z.array(z.string()),
    milestone: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    closedAt: z.string().nullable(),
    htmlUrl: z.string(),
    comments: z.number(),
    fields: z.record(z.string(), z.string()),
    type: z.string().nullable(),
  }),
});

/**
 * Tool that fetches detailed information about a single GitHub issue.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_get_issue',
  description:
    'Gets detailed information about a specific GitHub issue, including the labels and assignees on it, the ' +
    'organization\'s issue field values by field name, and the issue type. Returns { error: "unauthorized" } if ' +
    'no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubGetIssueResultSchema,
  effects: 'none',
})
export class GitHubGetIssueTool extends BaseTool<GitHubGetIssueArgs, object, GitHubGetIssueResult> {
  private readonly logger = new Logger(GitHubGetIssueTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER)
  private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(args: GitHubGetIssueArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubGetIssueResult>> {
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

    const issue = (await response.json()) as {
      id: number;
      number: number;
      title: string;
      body: string | null;
      state: string;
      user: { login: string };
      labels: Array<{ name: string }>;
      assignees: Array<{ login: string }>;
      milestone: { title: string } | null;
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      html_url: string;
      comments: number;
      issue_field_values?: RestIssueFieldValue[] | null;
      type?: { name?: string } | null;
    };

    return {
      data: {
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          user: issue.user.login,
          labels: issue.labels.map((l) => l.name),
          assignees: issue.assignees.map((a) => a.login),
          milestone: issue.milestone?.title ?? null,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          closedAt: issue.closed_at,
          htmlUrl: issue.html_url,
          comments: issue.comments,
          fields: issueFieldValues(issue.issue_field_values),
          type: issue.type?.name ?? null,
        },
      },
    };
  }
}
