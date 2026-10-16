import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GITHUB_TOKEN_PROVIDER } from '../../../token/index.js';
import {
  GitHubRemoveIssueAssigneesArgs,
  GitHubRemoveIssueAssigneesTool,
} from '../github-remove-issue-assignees.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = { owner: 'octo', repo: 'hello', issueNumber: 7, assignees: ['alice'] };

describe('GitHubRemoveIssueAssigneesTool', () => {
  let module: TestingModule;
  let tool: GitHubRemoveIssueAssigneesTool;

  const mockTokenProvider = {
    getToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubRemoveIssueAssigneesArgs) =>
    module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenProvider.getToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubRemoveIssueAssigneesTool)
      .withMock(GITHUB_TOKEN_PROVIDER, mockTokenProvider)
      .compile();

    tool = module.get(GitHubRemoveIssueAssigneesTool);
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
    it('sends the logins in the body of a DELETE and returns the remaining assignees', async () => {
      fetchMock.mockResolvedValue(Response.json({ number: 7, assignees: [{ login: 'bob' }] }, { status: 200 }));

      const result = await tool.call(args);

      expect(mockTokenProvider.getToken).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/issues/7/assignees', {
        method: 'DELETE',
        headers: HEADERS,
        body: JSON.stringify({ assignees: ['alice'] }),
      });
      expect(result.data).toEqual({ issueNumber: 7, assignees: ['bob'] });
    });

    it('reports an empty list when the issue is left unassigned', async () => {
      fetchMock.mockResolvedValue(Response.json({ number: 7, assignees: [] }, { status: 200 }));

      const result = await execute(args);

      expect(result.data).toEqual({ issueNumber: 7, assignees: [] });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues/7/assignees');
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
