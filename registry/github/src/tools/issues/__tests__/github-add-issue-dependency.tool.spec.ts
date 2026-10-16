import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GITHUB_TOKEN_PROVIDER } from '../../../token/index.js';
import { GitHubAddIssueDependencyArgs, GitHubAddIssueDependencyTool } from '../github-add-issue-dependency.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const BLOCKER_URL = 'https://api.github.com/repos/octo/hello/issues/4';
const DEPENDENCY_URL = 'https://api.github.com/repos/octo/hello/issues/7/dependencies/blocked_by';

const args = { owner: 'octo', repo: 'hello', issueNumber: 7, blockerNumber: 4 };

describe('GitHubAddIssueDependencyTool', () => {
  let module: TestingModule;
  let tool: GitHubAddIssueDependencyTool;

  const mockTokenProvider = {
    getToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubAddIssueDependencyArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenProvider.getToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubAddIssueDependencyTool)
      .withMock(GITHUB_TOKEN_PROVIDER, mockTokenProvider)
      .compile();

    tool = module.get(GitHubAddIssueDependencyTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, issueNumber and blockerNumber', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7 })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('reads the blocking issue before posting its database id', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ id: 9001, number: 4 }, { status: 200 }))
        .mockResolvedValueOnce(Response.json({}, { status: 201 }));

      const result = await tool.call(args);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe(BLOCKER_URL);
      expect(fetchMock.mock.calls[1][0]).toBe(DEPENDENCY_URL);
      expect(fetchMock.mock.calls[1][1]).toEqual({
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ issue_id: 9001 }),
      });
      expect(result.data).toEqual({ issueNumber: 7, blockerNumber: 4 });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValueOnce(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues/4');
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

    it.each([401, 403])('reports a rejected token when the lookup answers HTTP %i', async (status) => {
      fetchMock.mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it.each([401, 403])('reports a rejected token when the write answers HTTP %i', async (status) => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ id: 9001 }, { status: 200 }))
        .mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports a blocking issue that cannot be read, without writing anything', async () => {
      fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({
        error: 'blocker_not_found',
        message: 'Could not read issue #4 on octo/hello: Not Found',
      });
      expect(result.error).toBe('Could not read issue #4 on octo/hello: Not Found');
    });

    it('reports other API failures of the write as api_error', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ id: 9001 }, { status: 200 }))
        .mockResolvedValueOnce(new Response('bad', { status: 422, statusText: 'Unprocessable Entity' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Unprocessable Entity' });
      expect(result.error).toBe('GitHub API error: Unprocessable Entity');
    });
  });
});
