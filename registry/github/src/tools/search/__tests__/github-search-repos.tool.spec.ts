import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubSearchReposArgs, GitHubSearchReposTool } from '../github-search-repos.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubSearchReposTool', () => {
  let module: TestingModule;
  let tool: GitHubSearchReposTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubSearchReposArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubSearchReposTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubSearchReposTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires query and applies pagination defaults', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(schema.parse({ query: 'nestjs' })).toEqual({ query: 'nestjs', perPage: 30, page: 1 });
    });

    it('rejects an unknown sort', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ query: 'nestjs', sort: 'created' })).toThrow();
      expect(() => schema.parse({ query: 'nestjs', sort: 'help-wanted-issues' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ query: 'nestjs', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('searches repositories with an encoded query and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          total_count: 2,
          incomplete_results: false,
          items: [
            {
              id: 42,
              full_name: 'octo/hello',
              description: 'Hello world',
              html_url: 'https://github.com/octo/hello',
              language: 'TypeScript',
              stargazers_count: 120,
              forks_count: 8,
              updated_at: '2026-01-02T00:00:00Z',
            },
            {
              id: 43,
              full_name: 'octo/empty',
              description: null,
              html_url: 'https://github.com/octo/empty',
              language: null,
              stargazers_count: 0,
              forks_count: 0,
              updated_at: '2026-01-03T00:00:00Z',
            },
          ],
        }),
      );

      const result = await tool.call({ query: 'hello language:typescript' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories?q=hello+language%3Atypescript&per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        totalCount: 2,
        results: [
          {
            id: 42,
            fullName: 'octo/hello',
            description: 'Hello world',
            htmlUrl: 'https://github.com/octo/hello',
            language: 'TypeScript',
            stars: 120,
            forks: 8,
            updatedAt: '2026-01-02T00:00:00Z',
          },
          {
            id: 43,
            fullName: 'octo/empty',
            description: null,
            htmlUrl: 'https://github.com/octo/empty',
            language: null,
            stars: 0,
            forks: 0,
            updatedAt: '2026-01-03T00:00:00Z',
          },
        ],
      });
    });

    it('passes sort and pagination params', async () => {
      fetchMock.mockResolvedValue(Response.json({ total_count: 0, incomplete_results: false, items: [] }));

      await tool.call({ query: 'nestjs', sort: 'stars', perPage: 10, page: 3 });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/search/repositories?q=nestjs&per_page=10&page=3&sort=stars',
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ query: 'nestjs' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ query: 'nestjs' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('unavailable', { status: 503, statusText: 'Service Unavailable' }));

      const result = await execute({ query: 'nestjs' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Service Unavailable' });
      expect(result.error).toBe('GitHub API error: Service Unavailable');
    });
  });
});
