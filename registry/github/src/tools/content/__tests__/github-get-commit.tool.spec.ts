import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubGetCommitArgs, GitHubGetCommitTool } from '../github-get-commit.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', ref: 'abc123' };

const commitPayload = {
  sha: 'abc123',
  commit: {
    message: 'Fix bug',
    author: { name: 'Alice', email: 'alice@example.com', date: '2026-01-01T00:00:00Z' },
    committer: { name: 'GitHub', email: 'noreply@github.com', date: '2026-01-01T00:05:00Z' },
  },
  author: { login: 'alice' },
  html_url: 'https://github.com/octo/hello/commit/abc123',
  stats: { additions: 5, deletions: 1, total: 6 },
  files: [
    {
      sha: 'blob1',
      filename: 'src/index.ts',
      status: 'modified',
      additions: 5,
      deletions: 1,
      changes: 6,
      patch: '@@ -1 +1 @@',
    },
  ],
};

describe('GitHubGetCommitTool', () => {
  let module: TestingModule;
  let tool: GitHubGetCommitTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubGetCommitArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubGetCommitTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubGetCommitTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and ref', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the commit and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json(commitPayload));

      const result = await tool.call(args);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/commits/abc123', {
        headers: HEADERS,
      });
      expect(result.data).toEqual({
        commit: {
          sha: 'abc123',
          message: 'Fix bug',
          author: { name: 'Alice', email: 'alice@example.com', date: '2026-01-01T00:00:00Z', login: 'alice' },
          committer: { name: 'GitHub', date: '2026-01-01T00:05:00Z' },
          htmlUrl: 'https://github.com/octo/hello/commit/abc123',
          stats: { additions: 5, deletions: 1, total: 6 },
          files: [{ filename: 'src/index.ts', status: 'modified', additions: 5, deletions: 1, changes: 6 }],
        },
      });
    });

    it('maps a commit without a linked GitHub author to a null login', async () => {
      fetchMock.mockResolvedValue(Response.json({ ...commitPayload, author: null }));

      const result = await tool.call(args);

      expect(result.data).toMatchObject({ commit: { author: { login: null } } });
    });

    it('URL-encodes owner, repo and ref', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ owner: 'a/b', repo: 'c d', ref: 'feature/x' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/commits/feature%2Fx');
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
      fetchMock.mockResolvedValue(new Response('bad sha', { status: 422, statusText: 'Unprocessable Entity' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
