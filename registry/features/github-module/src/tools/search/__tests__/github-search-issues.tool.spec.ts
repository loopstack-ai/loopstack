import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubSearchIssuesArgs, GitHubSearchIssuesTool } from '../github-search-issues.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubSearchIssuesTool', () => {
  let module: TestingModule;
  let tool: GitHubSearchIssuesTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubSearchIssuesArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubSearchIssuesTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubSearchIssuesTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires query and applies pagination defaults', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(schema.parse({ query: 'is:open' })).toEqual({ query: 'is:open', perPage: 30, page: 1 });
    });

    it('rejects an unknown sort', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ query: 'is:open', sort: 'stars' })).toThrow();
      expect(() => schema.parse({ query: 'is:open', sort: 'reactions-+1' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ query: 'is:open', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('searches issues with an encoded query and flags pull requests', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          total_count: 2,
          incomplete_results: false,
          items: [
            {
              id: 1001,
              number: 7,
              title: 'Bug',
              state: 'open',
              user: { login: 'alice' },
              html_url: 'https://github.com/octo/hello/issues/7',
              repository_url: 'https://api.github.com/repos/octo/hello',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
            {
              id: 1002,
              number: 8,
              title: 'Fix bug',
              state: 'closed',
              user: { login: 'bob' },
              html_url: 'https://github.com/octo/hello/pull/8',
              repository_url: 'https://api.github.com/repos/octo/hello',
              created_at: '2026-01-03T00:00:00Z',
              updated_at: '2026-01-04T00:00:00Z',
              pull_request: { url: 'https://api.github.com/repos/octo/hello/pulls/8' },
            },
          ],
        }),
      );

      const result = await tool.call({ query: 'repo:octo/hello bug' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/search/issues?q=repo%3Aocto%2Fhello+bug&per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        totalCount: 2,
        results: [
          {
            id: 1001,
            number: 7,
            title: 'Bug',
            state: 'open',
            user: 'alice',
            htmlUrl: 'https://github.com/octo/hello/issues/7',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
            isPullRequest: false,
          },
          {
            id: 1002,
            number: 8,
            title: 'Fix bug',
            state: 'closed',
            user: 'bob',
            htmlUrl: 'https://github.com/octo/hello/pull/8',
            createdAt: '2026-01-03T00:00:00Z',
            updatedAt: '2026-01-04T00:00:00Z',
            isPullRequest: true,
          },
        ],
      });
    });

    it('passes sort and pagination params', async () => {
      fetchMock.mockResolvedValue(Response.json({ total_count: 0, incomplete_results: false, items: [] }));

      await tool.call({ query: 'is:open', sort: 'comments', perPage: 10, page: 2 });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/search/issues?q=is%3Aopen&per_page=10&page=2&sort=comments',
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ query: 'is:open' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ query: 'is:open' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('invalid query', { status: 422, statusText: 'Unprocessable Entity' }));

      const result = await execute({ query: 'is:open' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
