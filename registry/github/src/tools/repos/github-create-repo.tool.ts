import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { GitHubTokenService, type GitHubToolConfig, GitHubToolConfigSchema } from '../../token/index.js';

const inputSchema = z
  .object({
    name: z.string(),
    owner: z.string().optional(),
    description: z.string().optional(),
    private: z.boolean().default(false),
    autoInit: z.boolean().default(false),
  })
  .strict();

/**
 * Args for `GitHubCreateRepoTool`: repository `name`, optional `owner`, `description`,
 * `private` visibility and `autoInit` to seed an initial commit.
 *
 * GitHub has one endpoint for a person's repositories and another for an organization's. `owner` picks
 * between them: left out, or equal to the token's own account, the repository is created for that account;
 * any other owner is treated as an organization, which the token must be allowed to create in.
 *
 * @public
 */
export type GitHubCreateRepoArgs = z.input<typeof inputSchema>;

/**
 * Result for `GitHubCreateRepoTool`: the created `repo` summary, or an `error`.
 *
 * @public
 */
export type GitHubCreateRepoResult = {
  repo?: {
    id: number;
    fullName: string;
    name: string;
    htmlUrl: string;
    cloneUrl: string;
    private: boolean;
    defaultBranch: string;
  };
  error?: string;
  message?: string;
};

/**
 * Zod schema for the success shape of {@link GitHubCreateRepoResult}.
 *
 * @public
 */
export const GitHubCreateRepoResultSchema = z.strictObject({
  repo: z.strictObject({
    id: z.number(),
    fullName: z.string(),
    name: z.string(),
    htmlUrl: z.string(),
    /** The URL to clone from or push to, which is what a caller needs next. */
    cloneUrl: z.string(),
    private: z.boolean(),
    defaultBranch: z.string(),
  }),
});

/**
 * Tool that creates a new GitHub repository for the authenticated user.
 *
 * @providedBy GitHubModule
 * @public
 */
@Tool({
  name: 'github_create_repo',
  description:
    'Creates a new GitHub repository for the authenticated user, or under an organization when `owner` names ' +
    'one. Returns the repository with the URL to clone from, or { error: "unauthorized" } if no valid token is ' +
    'available.',
  schema: inputSchema,
  configSchema: GitHubToolConfigSchema,
  resultSchema: GitHubCreateRepoResultSchema,
  effects: 'external',
})
export class GitHubCreateRepoTool extends BaseTool<GitHubCreateRepoArgs, GitHubToolConfig, GitHubCreateRepoResult> {
  private readonly logger = new Logger(GitHubCreateRepoTool.name);

  @Inject()
  private readonly tokens!: GitHubTokenService;

  protected async handle(
    args: GitHubCreateRepoArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitHubToolConfig>,
  ): Promise<ToolEnvelope<GitHubCreateRepoResult>> {
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

    const body: Record<string, unknown> = {
      name: args.name,
      private: args.private ?? false,
      auto_init: args.autoInit ?? false,
    };

    if (args.description) body.description = args.description;

    // Which endpoint depends on who the token belongs to, so that is asked first.
    let path = 'user/repos';
    if (args.owner) {
      const whoami = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (!whoami.ok) {
        this.logger.error(`GitHub API error reading the token's account: ${whoami.status}`);
        return {
          data: {
            error: 'api_error',
            message: `GitHub API error: ${whoami.statusText}`,
          },
          error: `GitHub API error: ${whoami.statusText}`,
        };
      }
      const { login } = (await whoami.json()) as { login: string };
      if (login !== args.owner) path = `orgs/${encodeURIComponent(args.owner)}/repos`;
    }

    const response = await fetch(`https://api.github.com/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

    const repo = (await response.json()) as {
      id: number;
      full_name: string;
      name: string;
      html_url: string;
      clone_url: string;
      private: boolean;
      default_branch: string;
    };

    return {
      data: {
        repo: {
          id: repo.id,
          fullName: repo.full_name,
          name: repo.name,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          private: repo.private,
          defaultBranch: repo.default_branch,
        },
      },
    };
  }
}
