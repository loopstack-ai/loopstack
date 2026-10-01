import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubCreatePullRequestArgs, GitHubCreatePullRequestTool } from '../github-create-pull-request.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = { owner: 'octo', repo: 'hello', title: 'Add feature', head: 'feature/x', base: 'main' };

const prPayload = {
  id: 3003,
  number: 21,
  title: 'Add feature',
  html_url: 'https://github.com/octo/hello/pull/21',
  state: 'open',
  draft: false,
  head: { ref: 'feature/x' },
  base: { ref: 'main' },
};

describe('GitHubCreatePullRequestTool', () => {
  let module: TestingModule;
  let tool: GitHubCreatePullRequestTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubCreatePullRequestArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const requestBody = () => JSON.parse(request()[1].body as string) as unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubCreatePullRequestTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubCreatePullRequestTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, title, head and base and defaults draft', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', title: 'Add feature', head: 'feature/x' })).toThrow();
      expect(schema.parse(args)).toEqual({ ...args, draft: false });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('creates the pull request with all fields and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json({ ...prPayload, draft: true }, { status: 201 }));

      const result = await tool.call({ ...args, body: 'Implements X', draft: true });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      const [url, init] = request();
      expect(url).toBe('https://api.github.com/repos/octo/hello/pulls');
      expect(init).toEqual({ method: 'POST', headers: HEADERS, body: expect.any(String) });
      expect(requestBody()).toEqual({
        title: 'Add feature',
        head: 'feature/x',
        base: 'main',
        draft: true,
        body: 'Implements X',
      });
      expect(result.data).toEqual({
        pullRequest: {
          id: 3003,
          number: 21,
          title: 'Add feature',
          htmlUrl: 'https://github.com/octo/hello/pull/21',
          state: 'open',
          draft: true,
        },
      });
    });

    it('defaults draft to false and omits an absent body', async () => {
      fetchMock.mockResolvedValue(Response.json(prPayload, { status: 201 }));

      await tool.call(args);

      expect(requestBody()).toEqual({ title: 'Add feature', head: 'feature/x', base: 'main', draft: false });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(request()[0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/pulls');
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
      fetchMock.mockResolvedValue(
        new Response('{"message":"No commits between main and feature/x"}', {
          status: 422,
          statusText: 'Unprocessable Entity',
        }),
      );

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
