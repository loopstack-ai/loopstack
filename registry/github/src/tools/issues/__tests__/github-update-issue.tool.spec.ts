import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GitHubTokenService } from '../../../token/index.js';
import { GitHubUpdateIssueArgs, GitHubUpdateIssueTool } from '../github-update-issue.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = {
  owner: 'octo',
  repo: 'hello',
  issueNumber: 7,
  title: 'Fix the parser',
  body: 'The parser drops the last token.',
  type: 'Bug',
};

describe('GitHubUpdateIssueTool', () => {
  let module: TestingModule;
  let tool: GitHubUpdateIssueTool;

  const mockTokens = {
    resolve: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubUpdateIssueArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokens.resolve.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubUpdateIssueTool).withMock(GitHubTokenService, mockTokens).compile();

    tool = module.get(GitHubUpdateIssueTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires at least one of title, body and type', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7 })).toThrow();
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7, body: 'new body' })).not.toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('patches the issue and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json(
          {
            number: 7,
            title: 'Fix the parser',
            html_url: 'https://github.com/octo/hello/issues/7',
          },
          { status: 200 },
        ),
      );

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/issues/7', {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({
          title: 'Fix the parser',
          body: 'The parser drops the last token.',
          type: 'Bug',
        }),
      });
      expect(result.data).toEqual({
        issue: {
          number: 7,
          title: 'Fix the parser',
          htmlUrl: 'https://github.com/octo/hello/issues/7',
        },
      });
    });

    it('sends only the fields that were given', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ number: 7, title: 'Fix the parser', html_url: 'https://github.com/octo/hello/issues/7' }),
      );

      await execute({ owner: 'octo', repo: 'hello', issueNumber: 7, type: 'Task' });

      expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ type: 'Task' }));
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
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });
  });
});
