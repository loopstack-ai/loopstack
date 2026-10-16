import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GITHUB_TOKEN_PROVIDER } from '../../../token/index.js';
import { GitHubDeleteBranchArgs, GitHubDeleteBranchTool } from '../github-delete-branch.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', branch: 'feature/login' };

describe('GitHubDeleteBranchTool', () => {
  let module: TestingModule;
  let tool: GitHubDeleteBranchTool;

  const mockTokenProvider = {
    getToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubDeleteBranchArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenProvider.getToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubDeleteBranchTool)
      .withMock(GITHUB_TOKEN_PROVIDER, mockTokenProvider)
      .compile();

    tool = module.get(GitHubDeleteBranchTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and branch', () => {
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
    it('deletes the ref and keeps the slashes of the branch name', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await tool.call(args);

      expect(mockTokenProvider.getToken).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/git/refs/heads/feature/login', {
        method: 'DELETE',
        headers: HEADERS,
      });
      expect(result.data).toEqual({ branch: 'feature/login', deleted: true });
    });

    it('reports a branch that was already gone as deleted: false', async () => {
      fetchMock.mockResolvedValue(new Response('Reference does not exist', { status: 422 }));

      const result = await execute(args);

      expect(result.data).toEqual({ branch: 'feature/login', deleted: false });
      expect(result.error).toBeUndefined();
    });

    it('URL-encodes owner, repo and each branch segment', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await execute({ owner: 'a/b', repo: 'c d', branch: 'fix/a b' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/git/refs/heads/fix/a%20b');
    });

    it('returns unauthorized without calling the API when the provider has no token', async () => {
      mockTokenProvider.getToken.mockResolvedValue(null);

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
