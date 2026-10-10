import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema, parseToolResult } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubListPrReviewsArgs, GitHubListPrReviewsTool } from '../github-list-pr-reviews.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', pullNumber: 21 };

describe('GitHubListPrReviewsTool', () => {
  let module: TestingModule;
  let tool: GitHubListPrReviewsTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubListPrReviewsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubListPrReviewsTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubListPrReviewsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and pullNumber', () => {
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
    it('lists reviews and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            id: 901,
            user: { login: 'bob' },
            body: 'LGTM',
            state: 'APPROVED',
            submitted_at: '2026-01-02T00:00:00Z',
            html_url: 'https://github.com/octo/hello/pull/21#pullrequestreview-901',
            commit_id: 'abc123',
          },
          {
            id: 902,
            user: { login: 'carol' },
            body: '',
            state: 'CHANGES_REQUESTED',
            submitted_at: '2026-01-03T00:00:00Z',
            html_url: 'https://github.com/octo/hello/pull/21#pullrequestreview-902',
            commit_id: 'abc123',
          },
        ]),
      );

      const result = await tool.call(args);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/pulls/21/reviews', {
        headers: HEADERS,
      });
      expect(result.data).toEqual({
        reviews: [
          {
            id: 901,
            user: 'bob',
            body: 'LGTM',
            state: 'APPROVED',
            submittedAt: '2026-01-02T00:00:00Z',
            htmlUrl: 'https://github.com/octo/hello/pull/21#pullrequestreview-901',
          },
          {
            id: 902,
            user: 'carol',
            body: '',
            state: 'CHANGES_REQUESTED',
            submittedAt: '2026-01-03T00:00:00Z',
            htmlUrl: 'https://github.com/octo/hello/pull/21#pullrequestreview-902',
          },
        ],
      });
    });

    it('accepts a pending review without a submission time', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            id: 903,
            user: { login: 'dave' },
            body: '',
            state: 'PENDING',
            html_url: 'https://github.com/octo/hello/pull/21#pullrequestreview-903',
            commit_id: 'abc123',
          },
        ]),
      );

      const result = parseToolResult(tool, await execute(args));

      expect(result.data).toEqual({
        reviews: [
          {
            id: 903,
            user: 'dave',
            body: '',
            state: 'PENDING',
            submittedAt: undefined,
            htmlUrl: 'https://github.com/octo/hello/pull/21#pullrequestreview-903',
          },
        ],
      });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/pulls/21/reviews');
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
