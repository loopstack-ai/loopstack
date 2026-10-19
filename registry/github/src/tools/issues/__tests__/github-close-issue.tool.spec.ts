import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GitHubTokenService } from '../../../token/index.js';
import { GitHubCloseIssueArgs, GitHubCloseIssueTool } from '../github-close-issue.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = { owner: 'octo', repo: 'hello', issueNumber: 7 };

describe('GitHubCloseIssueTool', () => {
  let module: TestingModule;
  let tool: GitHubCloseIssueTool;

  const mockTokens = {
    resolve: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubCloseIssueArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokens.resolve.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubCloseIssueTool).withMock(GitHubTokenService, mockTokens).compile();

    tool = module.get(GitHubCloseIssueTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and issueNumber', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects notPlanned together with duplicateOf', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, notPlanned: true, duplicateOf: 3 })).toThrow();
      expect(() => schema.parse({ ...args, notPlanned: true })).not.toThrow();
      expect(() => schema.parse({ ...args, duplicateOf: 3 })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('closes the issue as completed and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json({ number: 7, state: 'closed', state_reason: 'completed' }));

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/issues/7', {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ state: 'closed' }),
      });
      expect(result.data).toEqual({ issue: { number: 7, state: 'closed', stateReason: 'completed' } });
    });

    it('closes the issue as not planned', async () => {
      fetchMock.mockResolvedValue(Response.json({ number: 7, state: 'closed', state_reason: 'not_planned' }));

      const result = await execute({ ...args, notPlanned: true });

      expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ state: 'closed', state_reason: 'not_planned' }));
      expect(result.data).toEqual({ issue: { number: 7, state: 'closed', stateReason: 'not_planned' } });
    });

    it('resolves the canonical issue number to its database id and closes the issue as a duplicate', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ id: 98765, number: 3 }))
        .mockResolvedValueOnce(Response.json({ number: 7, state: 'closed', state_reason: 'duplicate' }));

      const result = await execute({ ...args, duplicateOf: 3 });

      expect(fetchMock.mock.calls[0]).toEqual([
        'https://api.github.com/repos/octo/hello/issues/3',
        { headers: HEADERS },
      ]);
      expect(fetchMock.mock.calls[1]).toEqual([
        'https://api.github.com/repos/octo/hello/issues/7',
        {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({ state: 'closed', state_reason: 'duplicate', duplicate_issue_id: 98765 }),
        },
      ]);
      expect(result.data).toEqual({ issue: { number: 7, state: 'closed', stateReason: 'duplicate' } });
    });

    it('reports a missing canonical issue as api_error without closing the issue', async () => {
      fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute({ ...args, duplicateOf: 3 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });

    it('reports a null state reason as null', async () => {
      fetchMock.mockResolvedValue(Response.json({ number: 7, state: 'closed', state_reason: null }));

      const result = await execute(args);

      expect(result.data).toEqual({ issue: { number: 7, state: 'closed', stateReason: null } });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues/7');
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
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
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Internal Server Error' });
      expect(result.error).toBe('GitHub API error: Internal Server Error');
    });
  });
});
