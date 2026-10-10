import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubListPullRequestsArgs, GitHubListPullRequestsTool } from '../github-list-pull-requests.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListPullRequestsTool', () => {
  let module: TestingModule;
  let tool: GitHubListPullRequestsTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListPullRequestsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubListPullRequestsTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubListPullRequestsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner and repo and applies defaults', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo' })).toThrow();
      expect(schema.parse({ owner: 'octo', repo: 'hello' })).toEqual({
        owner: 'octo',
        repo: 'hello',
        state: 'open',
        perPage: 30,
        page: 1,
      });
    });

    it('rejects an unknown state', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', state: 'merged' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists pull requests with default params and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            id: 3003,
            number: 21,
            title: 'Add feature',
            state: 'open',
            user: { login: 'alice' },
            head: { ref: 'feature/x', sha: 'abc123' },
            base: { ref: 'main', sha: 'def456' },
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
            html_url: 'https://github.com/octo/hello/pull/21',
            draft: true,
          },
        ]),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/octo/hello/pulls?state=open&per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        pullRequests: [
          {
            id: 3003,
            number: 21,
            title: 'Add feature',
            state: 'open',
            user: 'alice',
            head: 'feature/x',
            headSha: 'abc123',
            base: 'main',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
            htmlUrl: 'https://github.com/octo/hello/pull/21',
            draft: true,
          },
        ],
      });
    });

    it('passes state, base and pagination params and URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      await tool.call({ owner: 'a/b', repo: 'c d', state: 'all', base: 'release/1.0', perPage: 50, page: 4 });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/a%2Fb/c%20d/pulls?state=all&per_page=50&page=4&base=release%2F1.0',
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ owner: 'octo', repo: 'hello' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ owner: 'octo', repo: 'hello' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute({ owner: 'octo', repo: 'hello' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });
  });
});
