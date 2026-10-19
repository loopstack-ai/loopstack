import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GitHubTokenService } from '../../../token/index.js';
import { GitHubAddIssueAssigneesArgs, GitHubAddIssueAssigneesTool } from '../github-add-issue-assignees.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = { owner: 'octo', repo: 'hello', issueNumber: 7, assignees: ['alice'] };

describe('GitHubAddIssueAssigneesTool', () => {
  let module: TestingModule;
  let tool: GitHubAddIssueAssigneesTool;

  const mockTokens = {
    resolve: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubAddIssueAssigneesArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokens.resolve.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubAddIssueAssigneesTool)
      .withMock(GitHubTokenService, mockTokens)
      .compile();

    tool = module.get(GitHubAddIssueAssigneesTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, issueNumber and assignees', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7 })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects an empty assignees list', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, assignees: [] })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('posts the assignees and returns the logins the issue now carries', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ number: 7, assignees: [{ login: 'alice' }, { login: 'bob' }] }, { status: 201 }),
      );

      const result = await tool.call({ ...args, assignees: ['alice', 'bob'] });

      expect(mockTokens.resolve).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/issues/7/assignees', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ assignees: ['alice', 'bob'] }),
      });
      expect(result.data).toEqual({ issueNumber: 7, assignees: ['alice', 'bob'] });
    });

    it('reports only the logins GitHub actually assigned, not the requested ones', async () => {
      fetchMock.mockResolvedValue(Response.json({ number: 7, assignees: [{ login: 'alice' }] }, { status: 201 }));

      const result = await execute({ ...args, assignees: ['alice', 'outsider'] });

      expect(result.data).toEqual({ issueNumber: 7, assignees: ['alice'] });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues/7/assignees');
    });

    it('returns unauthorized without calling the API when the provider has no token', async () => {
      mockTokens.resolve.mockResolvedValue(null);

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
