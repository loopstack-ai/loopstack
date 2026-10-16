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
    fields: z.record(z.string(), z.string()),
  })
  .strict();

/**
 * Args for `GitHubSetIssueFieldsTool`: the repository `owner`, `repo`, the `issueNumber`
 * and `fields`, a map of issue field name to the value to set.
 *
 * @public
 */
export type GitHubSetIssueFieldsArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubSetIssueFieldsTool`: the `fields` names that were set on the issue,
 * or an `error`.
 *
 * @public
 */
export type GitHubSetIssueFieldsResult =
  | {
      issueNumber: number;
      fields: string[];
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubSetIssueFieldsResult}.
 *
 * @public
 */
export const GitHubSetIssueFieldsResultSchema = z.strictObject({
  issueNumber: z.number(),
  fields: z.array(z.string()),
});

/** An issue field the repository offers: its numeric id, its name and, for a select, its option names. */
interface IssueFieldDefinition {
  id: number;
  name: string;
  options?: string[];
}

/**
 * The issue fields a repository offers. Only GraphQL lists them per repository; the REST listing is the
 * organization's. Reading them through the repository is deliberate: a fine grained token that may not list
 * the organization's fields still sees the ones its repository offers.
 */
const REPO_ISSUE_FIELDS_QUERY = `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      issueFields(first: 50) {
        nodes {
          ... on IssueFieldSingleSelect {
            fullDatabaseId
            name
            options {
              name
            }
          }
          ... on IssueFieldMultiSelect {
            fullDatabaseId
            name
            options {
              name
            }
          }
          ... on IssueFieldText {
            fullDatabaseId
            name
          }
          ... on IssueFieldNumber {
            fullDatabaseId
            name
          }
          ... on IssueFieldDate {
            fullDatabaseId
            name
          }
        }
      }
    }
  }
`;

/**
 * Tool that sets issue field values on a GitHub issue, by field name.
 *
 * Issue fields are defined on the organization, so their ids differ per organization and have to be looked
 * up by name before the values can be written.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_set_issue_fields',
  description:
    'Sets issue field values on a GitHub issue, by field name — a single select field by its option name. Fields that are not named are left as they are. Returns the field names that were set. Fails with { error: "unknown_field" } when the repository offers no field of that name, and with { error: "unknown_option" } when a select field has no such option, naming the field and listing the options it does have. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubSetIssueFieldsResultSchema,
  effects: 'external',
})
export class GitHubSetIssueFieldsTool extends BaseTool<GitHubSetIssueFieldsArgs, object, GitHubSetIssueFieldsResult> {
  private readonly logger = new Logger(GitHubSetIssueFieldsTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER)
  private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(
    args: GitHubSetIssueFieldsArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubSetIssueFieldsResult>> {
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

    const names = Object.keys(args.fields);
    if (!names.length) {
      return { data: { issueNumber: args.issueNumber, fields: [] } };
    }

    const defined = await this.repoIssueFields(args.owner, args.repo, accessToken, ctx);
    if ('error' in defined) {
      return { data: defined, error: defined.message };
    }

    // A field name the repository does not offer, or an option a select field does not define, fails here and
    // names what was wrong. A value that silently went nowhere would leave the issue without a priority, and
    // nobody would notice.
    const issueFieldValues: Array<{ field_id: number; value: string }> = [];
    for (const name of names) {
      const value = args.fields[name];
      const field = defined.fields.find((candidate) => candidate.name === name);

      if (!field) {
        const message = `${args.owner}/${args.repo} has no issue field "${name}".`;
        return { data: { error: 'unknown_field', message }, error: message };
      }

      if (field.options && !field.options.includes(value)) {
        const message =
          `The issue field "${name}" on ${args.owner}/${args.repo} has no option "${value}" ` +
          `(it has ${field.options.join(', ')}).`;
        return { data: { error: 'unknown_option', message }, error: message };
      }

      issueFieldValues.push({ field_id: field.id, value });
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.issueNumber}/issue-field-values`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issue_field_values: issueFieldValues }),
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

    return {
      data: {
        issueNumber: args.issueNumber,
        fields: names,
      },
    };
  }

  /** The issue fields the repository offers, or the error envelope payload to report instead. */
  private async repoIssueFields(
    owner: string,
    repo: string,
    accessToken: string,
    ctx: RunContext,
  ): Promise<{ fields: IssueFieldDefinition[] } | { error: string; message: string }> {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: REPO_ISSUE_FIELDS_QUERY, variables: { owner, name: repo } }),
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`GitHub API returned ${response.status} for user ${ctx.userId}`);
      return { error: '401', message: 'GitHub token was rejected. Please re-authenticate.' };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`GitHub API error: ${response.status} ${errorBody}`);
      return { error: 'api_error', message: `GitHub API error: ${response.statusText}` };
    }

    // GraphQL answers 200 even when it reports errors, so the body has to be checked as well.
    const payload = (await response.json()) as {
      data?: {
        repository?: {
          issueFields?: {
            nodes?: ({ fullDatabaseId?: string; name?: string; options?: { name: string }[] } | null)[] | null;
          } | null;
        } | null;
      } | null;
      errors?: { message?: string }[] | null;
    };

    if (payload.errors?.length || !payload.data) {
      const detail = payload.errors?.[0]?.message ?? 'no data';
      this.logger.error(`GitHub GraphQL query failed: ${detail}`);
      return { error: 'api_error', message: `GitHub GraphQL query failed: ${detail}` };
    }

    const fields = (payload.data.repository?.issueFields?.nodes ?? []).flatMap((node) =>
      node?.fullDatabaseId && node.name
        ? [{ id: Number(node.fullDatabaseId), name: node.name, options: node.options?.map((option) => option.name) }]
        : [],
    );

    return { fields };
  }
}
