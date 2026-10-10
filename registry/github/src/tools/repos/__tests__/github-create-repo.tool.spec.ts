import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubCreateRepoArgs, GitHubCreateRepoTool } from '../github-create-repo.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const repoPayload = {
  id: 77,
  full_name: 'octo/new-repo',
  name: 'new-repo',
  html_url: 'https://github.com/octo/new-repo',
  private: true,
  default_branch: 'main',
};

describe('GitHubCreateRepoTool', () => {
  let module: TestingModule;
  let tool: GitHubCreateRepoTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubCreateRepoArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const requestBody = () => JSON.parse(request()[1].body as string) as unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubCreateRepoTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubCreateRepoTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires name and applies defaults', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(schema.parse({ name: 'new-repo' })).toEqual({ name: 'new-repo', private: false, autoInit: false });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ name: 'new-repo', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('creates the repo with all options and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json(repoPayload, { status: 201 }));

      const result = await tool.call({ name: 'new-repo', description: 'A new repo', private: true, autoInit: true });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      const [url, init] = request();
      expect(url).toBe('https://api.github.com/user/repos');
      expect(init).toEqual({ method: 'POST', headers: HEADERS, body: expect.any(String) });
      expect(requestBody()).toEqual({ name: 'new-repo', description: 'A new repo', private: true, auto_init: true });
      expect(result.data).toEqual({
        repo: {
          id: 77,
          fullName: 'octo/new-repo',
          name: 'new-repo',
          htmlUrl: 'https://github.com/octo/new-repo',
          private: true,
          defaultBranch: 'main',
        },
      });
    });

    it('sends defaults and omits an absent description', async () => {
      fetchMock.mockResolvedValue(Response.json({ ...repoPayload, private: false }, { status: 201 }));

      await tool.call({ name: 'new-repo' });

      expect(requestBody()).toEqual({ name: 'new-repo', private: false, auto_init: false });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ name: 'new-repo' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ name: 'new-repo' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(
        new Response('{"message":"name already exists"}', { status: 422, statusText: 'Unprocessable Entity' }),
      );

      const result = await execute({ name: 'new-repo' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
