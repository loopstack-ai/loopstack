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
    name: z.string(),
    color: z.string(),
    description: z.string().optional(),
  })
  .strict();

/**
 * Args for `GitHubEnsureLabelTool`: the repository `owner`, `repo`, the label `name`, its
 * `color` as a six digit hex value without a leading `#`, and an optional `description`.
 *
 * @public
 */
export type GitHubEnsureLabelArgs = z.infer<typeof inputSchema>;

/**
 * Result for `GitHubEnsureLabelTool`: the label `name` and whether it was `created`, or an `error`.
 *
 * @public
 */
export type GitHubEnsureLabelResult =
  | {
      name: string;
      created: boolean;
    }
  | { error: string; message: string };

/**
 * Zod schema for the success shape of {@link GitHubEnsureLabelResult}.
 *
 * @public
 */
export const GitHubEnsureLabelResultSchema = z.strictObject({
  name: z.string(),
  created: z.boolean(),
});

/**
 * Tool that creates a label in a GitHub repository if it does not exist yet.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_ensure_label',
  description:
    'Makes sure a label exists in a GitHub repository, creating it with the given color and description when it ' +
    'does not. Returns created: true when the label was created and created: false when it already existed. ' +
    'An existing label keeps its current color and description. ' +
    'Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
  resultSchema: GitHubEnsureLabelResultSchema,
  effects: 'external',
})
export class GitHubEnsureLabelTool extends BaseTool<GitHubEnsureLabelArgs, object, GitHubEnsureLabelResult> {
  private readonly logger = new Logger(GitHubEnsureLabelTool.name);

  @Inject(GITHUB_TOKEN_PROVIDER) private readonly tokenProvider!: GitHubTokenProvider;

  protected async handle(args: GitHubEnsureLabelArgs, ctx: RunContext): Promise<ToolEnvelope<GitHubEnsureLabelResult>> {
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

    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/labels`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: args.name,
        color: args.color,
        description: args.description,
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

    // GitHub answers 422 when a label of that name is already in the repository. The label exists, which is what
    // the caller asked for, so this is reported as created: false instead of an error.
    if (response.status === 422) {
      return {
        data: {
          name: args.name,
          created: false,
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

    const label = (await response.json()) as { name: string };

    return {
      data: {
        name: label.name,
        created: true,
      },
    };
  }
}
