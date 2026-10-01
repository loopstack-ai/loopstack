import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubGetAuthenticatedUserTool } from '../github-get-authenticated-user.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubGetAuthenticatedUserTool', () => {
  let module: TestingModule;
  let tool: GitHubGetAuthenticatedUserTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = () => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, {});

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubGetAuthenticatedUserTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubGetAuthenticatedUserTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('accepts no args and rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ login: 'alice' })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the authenticated user and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 1,
          login: 'alice',
          name: 'Alice Doe',
          email: null,
          avatar_url: 'https://avatars.githubusercontent.com/u/1',
          html_url: 'https://github.com/alice',
          bio: null,
          public_repos: 12,
          followers: 34,
          following: 5,
          created_at: '2015-01-01T00:00:00Z',
          type: 'User',
        }),
      );

      const result = await tool.call({});

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/user', { headers: HEADERS });
      expect(result.data).toEqual({
        user: {
          id: 1,
          login: 'alice',
          name: 'Alice Doe',
          email: null,
          avatarUrl: 'https://avatars.githubusercontent.com/u/1',
          htmlUrl: 'https://github.com/alice',
          bio: null,
          publicRepos: 12,
          followers: 34,
          following: 5,
          createdAt: '2015-01-01T00:00:00Z',
        },
      });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute();

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }));

      const result = await execute();

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Internal Server Error' });
      expect(result.error).toBe('GitHub API error: Internal Server Error');
    });
  });
});
