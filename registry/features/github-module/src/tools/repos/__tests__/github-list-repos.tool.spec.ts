import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubListReposArgs, GitHubListReposTool } from '../github-list-repos.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListReposTool', () => {
  let module: TestingModule;
  let tool: GitHubListReposTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListReposArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubListReposTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubListReposTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('applies defaults when no args are given', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({})).toEqual({ visibility: 'all', sort: 'updated', perPage: 30, page: 1 });
    });

    it('rejects unknown enum values', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ visibility: 'internal' })).toThrow();
      expect(() => schema.parse({ sort: 'stars' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists repos with default query params and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            id: 42,
            full_name: 'octo/hello',
            name: 'hello',
            owner: { login: 'octo' },
            private: false,
            html_url: 'https://github.com/octo/hello',
            description: 'Hello world',
            language: 'TypeScript',
            default_branch: 'main',
            updated_at: '2026-01-02T00:00:00Z',
          },
          {
            id: 43,
            full_name: 'octo/secret',
            name: 'secret',
            owner: { login: 'octo' },
            private: true,
            html_url: 'https://github.com/octo/secret',
            description: null,
            language: null,
            default_branch: 'master',
            updated_at: '2026-01-03T00:00:00Z',
          },
        ]),
      );

      const result = await tool.call({});

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?visibility=all&sort=updated&per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        repos: [
          {
            id: 42,
            fullName: 'octo/hello',
            name: 'hello',
            owner: 'octo',
            private: false,
            htmlUrl: 'https://github.com/octo/hello',
            description: 'Hello world',
            language: 'TypeScript',
            defaultBranch: 'main',
            updatedAt: '2026-01-02T00:00:00Z',
          },
          {
            id: 43,
            fullName: 'octo/secret',
            name: 'secret',
            owner: 'octo',
            private: true,
            htmlUrl: 'https://github.com/octo/secret',
            description: null,
            language: null,
            defaultBranch: 'master',
            updatedAt: '2026-01-03T00:00:00Z',
          },
        ],
      });
    });

    it('passes visibility, sort and pagination params', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      const result = await tool.call({ visibility: 'private', sort: 'full_name', perPage: 5, page: 3 });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/user/repos?visibility=private&sort=full_name&per_page=5&page=3',
      );
      expect(result.data).toEqual({ repos: [] });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({});

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({});

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }));

      const result = await execute({});

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Internal Server Error' });
      expect(result.error).toBe('GitHub API error: Internal Server Error');
    });
  });
});
