import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { OAuthTokenStore } from '../../oauth-module';

export type GitHubOpenPRsArgs = {
  orgs: string[];
  perPage: number;
};

interface GitHubSearchResult {
  total_count: number;
  items: Array<{
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: string;
    draft: boolean;
    created_at: string;
    updated_at: string;
    user: { login: string };
    repository_url: string;
    labels: Array<{ name: string }>;
    pull_request: {
      merged_at: string | null;
    };
  }>;
}

@Tool({
  config: {
    description:
      'Lists open pull requests involving the authenticated user (authored or review-requested) across personal and specified organization repos. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GitHubOpenPRsTool implements ToolInterface {
  private readonly logger = new Logger(GitHubOpenPRsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        orgs: z.array(z.string()).default([]),
        perPage: z.number().default(25),
      })
      .strict(),
  })
  args: GitHubOpenPRsArgs;

  async execute(
    args: GitHubOpenPRsArgs,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'github');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      };
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Get the authenticated user's login
    const userResponse = await fetch('https://api.github.com/user', { headers });

    if (userResponse.status === 401 || userResponse.status === 403) {
      this.logger.warn(`GitHub API returned ${userResponse.status} for user ${ctx.userId}`);
      return {
        data: {
          error: 'unauthorized',
          message: 'GitHub token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!userResponse.ok) {
      const body = await userResponse.text();
      this.logger.error(`GitHub API error: ${userResponse.status} ${body}`);
      return {
        data: { error: 'api_error', message: `GitHub API error: ${userResponse.statusText}` },
      };
    }

    const user = (await userResponse.json()) as { login: string };

    // Build search query: open PRs authored by user OR requesting review from user,
    // scoped to user's repos + specified orgs
    const orgFilters = args.orgs.map((org) => `org:${org}`).join(' ');
    const query = `type:pr state:open involves:${user.login} ${orgFilters}`.trim();

    const params = new URLSearchParams({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: String(args.perPage),
    });

    const searchResponse = await fetch(
      `https://api.github.com/search/issues?${params.toString()}`,
      { headers },
    );

    if (!searchResponse.ok) {
      const body = await searchResponse.text();
      this.logger.error(`GitHub Search API error: ${searchResponse.status} ${body}`);
      return {
        data: { error: 'api_error', message: `GitHub API error: ${searchResponse.statusText}` },
      };
    }

    const data: GitHubSearchResult = (await searchResponse.json()) as GitHubSearchResult;

    const prs = data.items.map((item) => {
      // Extract repo name from repository_url (e.g. "https://api.github.com/repos/owner/name")
      const repoParts = item.repository_url.split('/');
      const repo = `${repoParts[repoParts.length - 2]}/${repoParts[repoParts.length - 1]}`;

      return {
        number: item.number,
        title: item.title,
        repo,
        url: item.html_url,
        author: item.user.login,
        draft: item.draft,
        labels: item.labels.map((l) => l.name),
        updatedAt: item.updated_at,
      };
    });

    return {
      data: { prs, total: data.total_count },
    };
  }
}
