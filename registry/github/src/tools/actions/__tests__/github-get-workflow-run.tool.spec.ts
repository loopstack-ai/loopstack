import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GitHubTokenService } from '../../../token/index.js';
import { GitHubGetWorkflowRunArgs, GitHubGetWorkflowRunTool } from '../github-get-workflow-run.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', runId: 987654321 };

describe('GitHubGetWorkflowRunTool', () => {
  let module: TestingModule;
  let tool: GitHubGetWorkflowRunTool;

  const mockTokens = {
    resolve: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubGetWorkflowRunArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokens.resolve.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubGetWorkflowRunTool)
      .withMock(GitHubTokenService, mockTokens)
      .compile();

    tool = module.get(GitHubGetWorkflowRunTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and a numeric runId', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse({ ...args, runId: '987654321' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the workflow run and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 987654321,
          name: 'CI',
          status: 'in_progress',
          conclusion: null,
          head_branch: 'main',
          head_sha: 'abc123',
          event: 'push',
          workflow_id: 111,
          run_number: 42,
          run_attempt: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:02:00Z',
          run_started_at: '2026-01-01T00:00:10Z',
          html_url: 'https://github.com/octo/hello/actions/runs/987654321',
        }),
      );

      const result = await tool.call(args);

      expect(mockTokens.resolve.mock.calls[0][0]).toMatchObject({ userId: 'test-user' });
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/actions/runs/987654321', {
        headers: HEADERS,
      });
      expect(result.data).toEqual({
        run: {
          id: 987654321,
          name: 'CI',
          status: 'in_progress',
          conclusion: null,
          headBranch: 'main',
          headSha: 'abc123',
          event: 'push',
          workflowId: 111,
          runNumber: 42,
          runAttempt: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:02:00Z',
          runStartedAt: '2026-01-01T00:00:10Z',
          htmlUrl: 'https://github.com/octo/hello/actions/runs/987654321',
        },
      });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/actions/runs/987654321');
    });

    it('answers with no workflow run when there is none of that id', async () => {
      fetchMock.mockResolvedValue(new Response('Not Found', { status: 404, statusText: 'Not Found' }));

      const result = await tool.call({ ...args, runId: 1 });

      // A missing workflow run is an answer: `call()` returns instead of throwing, as it does on an error envelope.
      expect(result.data).toEqual({ run: null });
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
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Server Error' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Server Error' });
      expect(result.error).toBe('GitHub API error: Server Error');
    });
  });
});
