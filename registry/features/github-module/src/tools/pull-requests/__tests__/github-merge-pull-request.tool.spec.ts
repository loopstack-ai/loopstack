import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubMergePullRequestArgs, GitHubMergePullRequestTool } from '../github-merge-pull-request.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = { owner: 'octo', repo: 'hello', pullNumber: 21 };

const mergePayload = { sha: 'merge123', merged: true, message: 'Pull Request successfully merged' };

describe('GitHubMergePullRequestTool', () => {
  let module: TestingModule;
  let tool: GitHubMergePullRequestTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubMergePullRequestArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const requestBody = () => JSON.parse(request()[1].body as string) as unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubMergePullRequestTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubMergePullRequestTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and pullNumber and defaults mergeMethod', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(schema.parse(args)).toEqual({ ...args, mergeMethod: 'merge' });
    });

    it('rejects an unknown merge method', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, mergeMethod: 'fast-forward' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('merges with the given method and commit details and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json(mergePayload));

      const result = await tool.call({
        ...args,
        mergeMethod: 'squash',
        commitTitle: 'Add feature (#21)',
        commitMessage: 'Squashed commits',
      });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      const [url, init] = request();
      expect(url).toBe('https://api.github.com/repos/octo/hello/pulls/21/merge');
      expect(init).toEqual({ method: 'PUT', headers: HEADERS, body: expect.any(String) });
      expect(requestBody()).toEqual({
        merge_method: 'squash',
        commit_title: 'Add feature (#21)',
        commit_message: 'Squashed commits',
      });
      expect(result.data).toEqual({
        merge: { sha: 'merge123', merged: true, message: 'Pull Request successfully merged' },
      });
    });

    it('defaults to a merge commit without commit details', async () => {
      fetchMock.mockResolvedValue(Response.json(mergePayload));

      await tool.call(args);

      expect(requestBody()).toEqual({ merge_method: 'merge' });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(request()[0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/pulls/21/merge');
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

    it.each([
      [405, 'Method Not Allowed'],
      [409, 'Conflict'],
    ])('reports HTTP %i as api_error', async (status, statusText) => {
      fetchMock.mockResolvedValue(new Response('{"message":"not mergeable"}', { status, statusText }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: `GitHub API error: ${statusText}` });
      expect(result.error).toBe(`GitHub API error: ${statusText}`);
    });
  });
});
