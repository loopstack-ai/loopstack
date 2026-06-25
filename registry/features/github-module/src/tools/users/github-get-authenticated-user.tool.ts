import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z.object({}).strict();

export type GitHubGetAuthenticatedUserArgs = z.infer<typeof inputSchema>;

export type GitHubGetAuthenticatedUserResult = {
  user?: {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatarUrl: string;
    htmlUrl: string;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: string;
  };
  error?: string;
  message?: string;
};

@Tool({
  name: 'github_get_authenticated_user',
  description:
    'Gets the profile of the currently authenticated GitHub user. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GitHubGetAuthenticatedUserTool extends BaseTool<
  GitHubGetAuthenticatedUserArgs,
  object,
  GitHubGetAuthenticatedUserResult
> {
  private readonly logger = new Logger(GitHubGetAuthenticatedUserTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    _args: GitHubGetAuthenticatedUserArgs,
    ctx: RunContext,
  ): Promise<ToolEnvelope<GitHubGetAuthenticatedUserResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
        error: 'No valid GitHub token found. Please authenticate first.',
      };
    }

    const response = await fetch('https://api.github.com/user', {
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

    const user = (await response.json()) as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string;
      html_url: string;
      bio: string | null;
      public_repos: number;
      followers: number;
      following: number;
      created_at: string;
    };

    return {
      data: {
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatar_url,
          htmlUrl: user.html_url,
          bio: user.bio,
          publicRepos: user.public_repos,
          followers: user.followers,
          following: user.following,
          createdAt: user.created_at,
        },
      },
    };
  }
}
