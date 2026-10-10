import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubTriggerWorkflowArgs, GitHubTriggerWorkflowTool } from '../github-trigger-workflow.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = { owner: 'octo', repo: 'hello', workflowId: 'deploy.yml', ref: 'main' };

describe('GitHubTriggerWorkflowTool', () => {
  let module: TestingModule;
  let tool: GitHubTriggerWorkflowTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubTriggerWorkflowArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const requestBody = () => JSON.parse(request()[1].body as string) as unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubTriggerWorkflowTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubTriggerWorkflowTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, workflowId and ref', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', workflowId: 'deploy.yml' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('only accepts string input values', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, inputs: { env: 'prod' } })).not.toThrow();
      expect(() => schema.parse({ ...args, inputs: { dryRun: true } })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('dispatches the workflow with inputs and reports success on 204', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await tool.call({ ...args, inputs: { env: 'prod', version: '1.2.3' } });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      const [url, init] = request();
      expect(url).toBe('https://api.github.com/repos/octo/hello/actions/workflows/deploy.yml/dispatches');
      expect(init).toEqual({ method: 'POST', headers: HEADERS, body: expect.any(String) });
      expect(requestBody()).toEqual({ ref: 'main', inputs: { env: 'prod', version: '1.2.3' } });
      expect(result.data).toEqual({ triggered: true, message: 'Workflow dispatch event triggered successfully.' });
    });

    it('omits inputs when none are given', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await tool.call(args);

      expect(requestBody()).toEqual({ ref: 'main' });
    });

    it('URL-encodes owner, repo and workflowId', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await tool.call({ ...args, owner: 'a/b', repo: 'c d', workflowId: 'ci/deploy.yml' });

      expect(request()[0]).toBe(
        'https://api.github.com/repos/a%2Fb/c%20d/actions/workflows/ci%2Fdeploy.yml/dispatches',
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

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

    it.each([
      [404, 'Not Found'],
      [422, 'Unprocessable Entity'],
    ])('reports HTTP %i as api_error', async (status, statusText) => {
      fetchMock.mockResolvedValue(
        new Response('{"message":"Workflow does not have workflow_dispatch"}', { status, statusText }),
      );

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: `GitHub API error: ${statusText}` });
      expect(result.error).toBe(`GitHub API error: ${statusText}`);
    });
  });
});
