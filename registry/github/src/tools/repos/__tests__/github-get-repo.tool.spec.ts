import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubGetRepoArgs, GitHubGetRepoTool } from '../github-get-repo.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const repoPayload = {
  id: 42,
  full_name: 'octo/hello',
  name: 'hello',
  owner: { login: 'octo', avatar_url: 'https://avatars.githubusercontent.com/u/1' },
  private: false,
  html_url: 'https://github.com/octo/hello',
  description: 'Hello world',
  language: 'TypeScript',
  default_branch: 'main',
  stargazers_count: 120,
  forks_count: 8,
  open_issues_count: 3,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  topics: ['cli', 'demo'],
  license: { spdx_id: 'MIT' },
};

describe('GitHubGetRepoTool', () => {
  let module: TestingModule;
  let tool: GitHubGetRepoTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubGetRepoArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubGetRepoTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubGetRepoTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner and repo', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo' })).toThrow();
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the repo with the user token and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json(repoPayload));

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello', { headers: HEADERS });
      expect(result.data).toEqual({
        repo: {
          id: 42,
          fullName: 'octo/hello',
          name: 'hello',
          owner: 'octo',
          ownerAvatar: 'https://avatars.githubusercontent.com/u/1',
          private: false,
          htmlUrl: 'https://github.com/octo/hello',
          description: 'Hello world',
          language: 'TypeScript',
          defaultBranch: 'main',
          stars: 120,
          forks: 8,
          openIssues: 3,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
          topics: ['cli', 'demo'],
          license: 'MIT',
        },
      });
    });

    it('maps a missing license to null', async () => {
      fetchMock.mockResolvedValue(Response.json({ ...repoPayload, license: null }));

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(result.data).toMatchObject({ repo: { license: null } });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d');
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
