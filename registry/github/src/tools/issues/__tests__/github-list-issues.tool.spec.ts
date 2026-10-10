import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubListIssuesArgs, GitHubListIssuesTool } from '../github-list-issues.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListIssuesTool', () => {
  let module: TestingModule;
  let tool: GitHubListIssuesTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListIssuesArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubListIssuesTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubListIssuesTool);
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
    it('lists issues with default params and flags pull requests', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            id: 1001,
            number: 7,
            title: 'Bug',
            state: 'open',
            user: { login: 'alice' },
            labels: [{ name: 'bug' }],
            assignees: [{ login: 'bob' }],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
            html_url: 'https://github.com/octo/hello/issues/7',
          },
          {
            id: 1002,
            number: 8,
            title: 'Add feature',
            state: 'open',
            user: { login: 'carol' },
            labels: [],
            assignees: [],
            created_at: '2026-01-03T00:00:00Z',
            updated_at: '2026-01-04T00:00:00Z',
            html_url: 'https://github.com/octo/hello/pull/8',
            pull_request: { url: 'https://api.github.com/repos/octo/hello/pulls/8' },
          },
        ]),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/octo/hello/issues?state=open&per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        issues: [
          {
            id: 1001,
            number: 7,
            title: 'Bug',
            state: 'open',
            user: 'alice',
            labels: ['bug'],
            assignees: ['bob'],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
            htmlUrl: 'https://github.com/octo/hello/issues/7',
            isPullRequest: false,
          },
          {
            id: 1002,
            number: 8,
            title: 'Add feature',
            state: 'open',
            user: 'carol',
            labels: [],
            assignees: [],
            createdAt: '2026-01-03T00:00:00Z',
            updatedAt: '2026-01-04T00:00:00Z',
            htmlUrl: 'https://github.com/octo/hello/pull/8',
            isPullRequest: true,
          },
        ],
      });
    });

    it('passes state, filters and pagination params and URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      await tool.call({
        owner: 'a/b',
        repo: 'c d',
        state: 'closed',
        labels: 'bug,help wanted',
        assignee: 'bob',
        perPage: 10,
        page: 2,
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/a%2Fb/c%20d/issues?state=closed&per_page=10&page=2&labels=bug%2Chelp+wanted&assignee=bob',
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
