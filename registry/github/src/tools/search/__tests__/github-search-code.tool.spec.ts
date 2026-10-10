import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubSearchCodeArgs, GitHubSearchCodeTool } from '../github-search-code.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubSearchCodeTool', () => {
  let module: TestingModule;
  let tool: GitHubSearchCodeTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubSearchCodeArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubSearchCodeTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubSearchCodeTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires query and applies pagination defaults', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(schema.parse({ query: 'foo' })).toEqual({ query: 'foo', perPage: 30, page: 1 });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ query: 'foo', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('searches code with an encoded query and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          total_count: 1,
          incomplete_results: false,
          items: [
            {
              name: 'index.ts',
              path: 'src/index.ts',
              sha: 'blob123',
              html_url: 'https://github.com/octo/hello/blob/main/src/index.ts',
              repository: { id: 42, full_name: 'octo/hello' },
              score: 1,
            },
          ],
        }),
      );

      const result = await tool.call({ query: 'useState repo:octo/hello language:ts' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/search/code?q=useState+repo%3Aocto%2Fhello+language%3Ats&per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        totalCount: 1,
        results: [
          {
            name: 'index.ts',
            path: 'src/index.ts',
            sha: 'blob123',
            htmlUrl: 'https://github.com/octo/hello/blob/main/src/index.ts',
            repository: 'octo/hello',
          },
        ],
      });
    });

    it('passes pagination params', async () => {
      fetchMock.mockResolvedValue(Response.json({ total_count: 0, incomplete_results: false, items: [] }));

      const result = await tool.call({ query: 'foo', perPage: 100, page: 5 });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/search/code?q=foo&per_page=100&page=5');
      expect(result.data).toEqual({ totalCount: 0, results: [] });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ query: 'foo' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ query: 'foo' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('invalid query', { status: 422, statusText: 'Unprocessable Entity' }));

      const result = await execute({ query: 'foo' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
