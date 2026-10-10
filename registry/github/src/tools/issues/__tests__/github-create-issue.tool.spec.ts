import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubCreateIssueArgs, GitHubCreateIssueTool } from '../github-create-issue.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const issuePayload = {
  id: 2002,
  number: 12,
  title: 'New bug',
  html_url: 'https://github.com/octo/hello/issues/12',
  state: 'open',
  user: { login: 'alice' },
};

describe('GitHubCreateIssueTool', () => {
  let module: TestingModule;
  let tool: GitHubCreateIssueTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubCreateIssueArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const requestBody = () => JSON.parse(request()[1].body as string) as unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubCreateIssueTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubCreateIssueTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and title', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', title: 'Bug' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', title: 'Bug', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('creates the issue with all fields and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json(issuePayload, { status: 201 }));

      const result = await tool.call({
        owner: 'octo',
        repo: 'hello',
        title: 'New bug',
        body: 'Steps to reproduce',
        labels: ['bug'],
        assignees: ['bob'],
      });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      const [url, init] = request();
      expect(url).toBe('https://api.github.com/repos/octo/hello/issues');
      expect(init).toEqual({ method: 'POST', headers: HEADERS, body: expect.any(String) });
      expect(requestBody()).toEqual({
        title: 'New bug',
        body: 'Steps to reproduce',
        labels: ['bug'],
        assignees: ['bob'],
      });
      expect(result.data).toEqual({
        issue: {
          id: 2002,
          number: 12,
          title: 'New bug',
          htmlUrl: 'https://github.com/octo/hello/issues/12',
          state: 'open',
        },
      });
    });

    it('sends only the title when optional fields are absent', async () => {
      fetchMock.mockResolvedValue(Response.json(issuePayload, { status: 201 }));

      await tool.call({ owner: 'octo', repo: 'hello', title: 'New bug' });

      expect(requestBody()).toEqual({ title: 'New bug' });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ owner: 'a/b', repo: 'c d', title: 'Bug' });

      expect(request()[0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues');
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ owner: 'octo', repo: 'hello', title: 'Bug' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ owner: 'octo', repo: 'hello', title: 'Bug' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('invalid', { status: 422, statusText: 'Unprocessable Entity' }));

      const result = await execute({ owner: 'octo', repo: 'hello', title: 'Bug' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
