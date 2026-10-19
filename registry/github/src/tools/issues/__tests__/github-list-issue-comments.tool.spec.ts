import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GitHubTokenService } from '../../../token/index.js';
import { GitHubListIssueCommentsArgs, GitHubListIssueCommentsTool } from '../github-list-issue-comments.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', issueNumber: 7 };

describe('GitHubListIssueCommentsTool', () => {
  let module: TestingModule;
  let tool: GitHubListIssueCommentsTool;

  const mockTokens = {
    resolve: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubListIssueCommentsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokens.resolve.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubListIssueCommentsTool)
      .withMock(GitHubTokenService, mockTokens)
      .compile();

    tool = module.get(GitHubListIssueCommentsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and issueNumber', () => {
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
    it('reads the comments and maps id, author, time and body', async () => {
      fetchMock.mockResolvedValue(
        Response.json(
          [
            { id: 1, user: { login: 'alice' }, created_at: '2026-01-05T00:00:00Z', body: 'First' },
            { id: 2, user: { login: 'bob' }, created_at: '2026-01-06T00:00:00Z', body: 'Second' },
          ],
          { status: 200 },
        ),
      );

      const result = await tool.call(args);

      expect(mockTokens.resolve).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/issues/7/comments?per_page=100', {
        headers: HEADERS,
      });
      expect(result.data).toEqual({
        comments: [
          { id: 1, user: 'alice', createdAt: '2026-01-05T00:00:00Z', body: 'First' },
          { id: 2, user: 'bob', createdAt: '2026-01-06T00:00:00Z', body: 'Second' },
        ],
      });
    });

    it('falls back to empty strings for a missing author or body', async () => {
      fetchMock.mockResolvedValue(
        Response.json([{ id: 3, user: null, created_at: '2026-01-07T00:00:00Z', body: null }], { status: 200 }),
      );

      const result = await execute(args);

      expect(result.data).toEqual({
        comments: [{ id: 3, user: '', createdAt: '2026-01-07T00:00:00Z', body: '' }],
      });
    });

    it('returns an empty list for an issue without comments', async () => {
      fetchMock.mockResolvedValue(Response.json([], { status: 200 }));

      const result = await execute(args);

      expect(result.data).toEqual({ comments: [] });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/a%2Fb/c%20d/issues/7/comments?per_page=100',
      );
    });

    it('returns unauthorized without calling the API when the provider has no token', async () => {
      mockTokens.resolve.mockResolvedValue(null);

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
