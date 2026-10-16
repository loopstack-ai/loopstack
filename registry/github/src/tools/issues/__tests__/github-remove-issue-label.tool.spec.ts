import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GITHUB_TOKEN_PROVIDER } from '../../../token/index.js';
import { GitHubRemoveIssueLabelArgs, GitHubRemoveIssueLabelTool } from '../github-remove-issue-label.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', issueNumber: 7, label: 'status:triage' };

describe('GitHubRemoveIssueLabelTool', () => {
  let module: TestingModule;
  let tool: GitHubRemoveIssueLabelTool;

  const mockTokenProvider = {
    getToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubRemoveIssueLabelArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenProvider.getToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubRemoveIssueLabelTool)
      .withMock(GITHUB_TOKEN_PROVIDER, mockTokenProvider)
      .compile();

    tool = module.get(GitHubRemoveIssueLabelTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, issueNumber and label', () => {
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
    it('removes the label and reports it as removed', async () => {
      fetchMock.mockResolvedValue(Response.json([{ name: 'bug' }], { status: 200 }));

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/octo/hello/issues/7/labels/status%3Atriage',
        {
          method: 'DELETE',
          headers: HEADERS,
        },
      );
      expect(result.data).toEqual({ label: 'status:triage', removed: true });
    });

    it('URL-encodes owner, repo and the label', async () => {
      fetchMock.mockResolvedValue(Response.json([], { status: 200 }));

      await execute({ ...args, owner: 'a/b', repo: 'c d', label: 'needs review' });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/a%2Fb/c%20d/issues/7/labels/needs%20review',
      );
    });

    it('reports a label that was not set as not removed on HTTP 404', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(args);

      expect(result.data).toEqual({ label: 'status:triage', removed: false });
      expect(result.error).toBeUndefined();
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
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
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Internal Server Error' });
      expect(result.error).toBe('GitHub API error: Internal Server Error');
    });
  });
});
