import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubGetPullRequestArgs, GitHubGetPullRequestTool } from '../github-get-pull-request.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', pullNumber: 21 };

describe('GitHubGetPullRequestTool', () => {
  let module: TestingModule;
  let tool: GitHubGetPullRequestTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubGetPullRequestArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubGetPullRequestTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubGetPullRequestTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and pullNumber', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', pullNumber: '21' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the pull request and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 3003,
          number: 21,
          title: 'Add feature',
          body: 'Implements X',
          state: 'closed',
          user: { login: 'alice' },
          head: { ref: 'feature/x', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          merged: true,
          mergeable: null,
          draft: false,
          additions: 10,
          deletions: 2,
          changed_files: 3,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          merged_at: '2026-01-02T00:00:00Z',
          html_url: 'https://github.com/octo/hello/pull/21',
          comments: 1,
          review_comments: 4,
        }),
      );

      const result = await tool.call(args);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/pulls/21', { headers: HEADERS });
      expect(result.data).toEqual({
        pullRequest: {
          id: 3003,
          number: 21,
          title: 'Add feature',
          body: 'Implements X',
          state: 'closed',
          user: 'alice',
          head: 'feature/x',
          headSha: 'abc123',
          base: 'main',
          merged: true,
          mergeable: null,
          draft: false,
          additions: 10,
          deletions: 2,
          changedFiles: 3,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
          mergedAt: '2026-01-02T00:00:00Z',
          htmlUrl: 'https://github.com/octo/hello/pull/21',
          comments: 1,
          reviewComments: 4,
        },
      });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/pulls/21');
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute(args);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });
  });
});
