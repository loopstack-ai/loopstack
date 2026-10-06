import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubListWorkflowRunsArgs, GitHubListWorkflowRunsTool } from '../github-list-workflow-runs.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListWorkflowRunsTool', () => {
  let module: TestingModule;
  let tool: GitHubListWorkflowRunsTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListWorkflowRunsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubListWorkflowRunsTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubListWorkflowRunsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner and repo and applies pagination defaults', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo' })).toThrow();
      expect(schema.parse({ owner: 'octo', repo: 'hello' })).toEqual({
        owner: 'octo',
        repo: 'hello',
        perPage: 30,
        page: 1,
      });
    });

    it('rejects an unknown status', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', status: 'running' })).toThrow();
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', status: 'failure' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists workflow runs with default params and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          total_count: 57,
          workflow_runs: [
            {
              id: 987654321,
              name: 'CI',
              status: 'completed',
              conclusion: 'success',
              head_branch: 'main',
              head_sha: 'abc123',
              event: 'push',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:05:00Z',
              html_url: 'https://github.com/octo/hello/actions/runs/987654321',
              workflow_id: 111,
            },
            {
              id: 987654322,
              name: 'CI',
              status: 'queued',
              conclusion: null,
              head_branch: 'feature/x',
              head_sha: 'def456',
              event: 'pull_request',
              created_at: '2026-01-02T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
              html_url: 'https://github.com/octo/hello/actions/runs/987654322',
              workflow_id: 111,
            },
          ],
        }),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/octo/hello/actions/runs?per_page=30&page=1',
        { headers: HEADERS },
      );
      expect(result.data).toEqual({
        totalCount: 57,
        runs: [
          {
            id: 987654321,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            headBranch: 'main',
            headSha: 'abc123',
            event: 'push',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:05:00Z',
            htmlUrl: 'https://github.com/octo/hello/actions/runs/987654321',
          },
          {
            id: 987654322,
            name: 'CI',
            status: 'queued',
            conclusion: null,
            headBranch: 'feature/x',
            headSha: 'def456',
            event: 'pull_request',
            createdAt: '2026-01-02T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
            htmlUrl: 'https://github.com/octo/hello/actions/runs/987654322',
          },
        ],
      });
    });

    it('passes branch, status and pagination params and URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(Response.json({ total_count: 0, workflow_runs: [] }));

      const result = await tool.call({
        owner: 'a/b',
        repo: 'c d',
        branch: 'feature/x',
        status: 'failure',
        perPage: 10,
        page: 2,
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/a%2Fb/c%20d/actions/runs?per_page=10&page=2&branch=feature%2Fx&status=failure',
      );
      expect(result.data).toEqual({ totalCount: 0, runs: [] });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ owner: 'octo', repo: 'hello' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ owner: 'octo', repo: 'hello' });

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute({ owner: 'octo', repo: 'hello' });

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });
  });
});
