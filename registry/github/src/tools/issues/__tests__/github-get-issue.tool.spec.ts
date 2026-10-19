import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GitHubTokenService } from '../../../token/index.js';
import { GitHubGetIssueArgs, GitHubGetIssueTool } from '../github-get-issue.tool.js';

describe('GitHubGetIssueTool', () => {
  let module: TestingModule;
  let tool: GitHubGetIssueTool;

  const mockTokens = {
    resolve: vi.fn(),
  };
  const fetchMock = vi.fn();

  // `tool.call()` throws on an error envelope; the pipeline returns the envelope itself.
  const execute = (args: GitHubGetIssueArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokens.resolve.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubGetIssueTool).withMock(GitHubTokenService, mockTokens).compile();

    tool = module.get(GitHubGetIssueTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and issueNumber', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7 })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the issue with the user token and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 1001,
          number: 7,
          title: 'Bug',
          body: 'It breaks',
          state: 'open',
          user: { login: 'alice' },
          labels: [{ name: 'bug' }, { name: 'p1' }],
          assignees: [{ login: 'bob' }],
          milestone: { title: 'v1' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          closed_at: null,
          html_url: 'https://github.com/octo/hello/issues/7',
          comments: 3,
        }),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello', issueNumber: 7 });

      expect(mockTokens.resolve.mock.calls[0][0]).toMatchObject({ userId: 'test-user' });
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/issues/7', {
        headers: {
          Authorization: 'Bearer gh-token',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      expect(result.data).toEqual({
        issue: {
          id: 1001,
          number: 7,
          title: 'Bug',
          body: 'It breaks',
          state: 'open',
          user: 'alice',
          labels: ['bug', 'p1'],
          assignees: ['bob'],
          milestone: 'v1',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
          closedAt: null,
          htmlUrl: 'https://github.com/octo/hello/issues/7',
          comments: 3,
          fields: {},
          type: null,
        },
      });
    });

    it('maps the issue field values and the issue type', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 1001,
          number: 7,
          title: 'Bug',
          body: null,
          state: 'open',
          user: { login: 'alice' },
          labels: [],
          assignees: [],
          milestone: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          closed_at: null,
          html_url: 'https://github.com/octo/hello/issues/7',
          comments: 0,
          type: { name: 'Bug' },
          issue_field_values: [
            { issue_field_name: 'Priority', single_select_option: { name: 'High' } },
            { issue_field_name: 'Estimate', value: 3 },
            // Neither text nor a number, so there is no one way to render it.
            { issue_field_name: 'Owners', value: [{ login: 'alice' }] },
            // No field name to key it by.
            { value: 'orphan' },
          ],
        }),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello', issueNumber: 7 });

      expect(result.data).toEqual(
        expect.objectContaining({
          issue: expect.objectContaining({ fields: { Priority: 'High', Estimate: '3' }, type: 'Bug' }),
        }),
      );
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ owner: 'a/b', repo: 'c d', issueNumber: 1 });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues/1');
    });

    it('answers with no issue when there is none of that number', async () => {
      fetchMock.mockResolvedValue(new Response('Not Found', { status: 404, statusText: 'Not Found' }));

      const result = await tool.call({ owner: 'octo', repo: 'hello', issueNumber: 99 });

      // A missing issue is an answer: `call()` returns instead of throwing, as it does on an error envelope.
      expect(result.data).toEqual({ issue: null });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokens.resolve.mockResolvedValue(null);

      const result = await execute({ owner: 'octo', repo: 'hello', issueNumber: 7 });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ owner: 'octo', repo: 'hello', issueNumber: 7 });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Server Error' }));

      const result = await execute({ owner: 'octo', repo: 'hello', issueNumber: 7 });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Server Error' });
      expect(result.error).toBe('GitHub API error: Server Error');
    });
  });
});
