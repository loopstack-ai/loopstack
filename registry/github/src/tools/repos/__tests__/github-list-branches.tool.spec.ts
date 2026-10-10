import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubListBranchesArgs, GitHubListBranchesTool } from '../github-list-branches.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListBranchesTool', () => {
  let module: TestingModule;
  let tool: GitHubListBranchesTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListBranchesArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubListBranchesTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubListBranchesTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner and repo and defaults perPage', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo' })).toThrow();
      expect(schema.parse({ owner: 'octo', repo: 'hello' })).toEqual({ owner: 'octo', repo: 'hello', perPage: 30 });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists branches with the default page size and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          { name: 'main', commit: { sha: 'abc123', url: 'https://api.github.com/x' }, protected: true },
          { name: 'feature/x', commit: { sha: 'def456', url: 'https://api.github.com/y' }, protected: false },
        ]),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/branches?per_page=30', {
        headers: HEADERS,
      });
      expect(result.data).toEqual({
        branches: [
          { name: 'main', commitSha: 'abc123', protected: true },
          { name: 'feature/x', commitSha: 'def456', protected: false },
        ],
      });
    });

    it('passes perPage and URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      await tool.call({ owner: 'a/b', repo: 'c d', perPage: 100 });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/branches?per_page=100');
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
