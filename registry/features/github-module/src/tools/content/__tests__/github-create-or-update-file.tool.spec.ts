import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubCreateOrUpdateFileArgs, GitHubCreateOrUpdateFileTool } from '../github-create-or-update-file.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const args = {
  owner: 'octo',
  repo: 'hello',
  path: 'docs/readme.md',
  content: 'Hello, wörld!\n',
  message: 'Update readme',
};

const filePayload = {
  content: {
    name: 'readme.md',
    path: 'docs/readme.md',
    sha: 'blob456',
    size: 15,
    html_url: 'https://github.com/octo/hello/blob/main/docs/readme.md',
  },
  commit: {
    sha: 'commit789',
    message: 'Update readme',
    html_url: 'https://github.com/octo/hello/commit/commit789',
  },
};

describe('GitHubCreateOrUpdateFileTool', () => {
  let module: TestingModule;
  let tool: GitHubCreateOrUpdateFileTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubCreateOrUpdateFileArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const requestBody = () => JSON.parse(request()[1].body as string) as unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubCreateOrUpdateFileTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubCreateOrUpdateFileTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, path, content and message', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', path: 'a.txt', content: 'x' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('creates a file with base64-encoded content and maps the response', async () => {
      fetchMock.mockResolvedValue(Response.json(filePayload, { status: 201 }));

      const result = await tool.call(args);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      const [url, init] = request();
      expect(url).toBe('https://api.github.com/repos/octo/hello/contents/docs/readme.md');
      expect(init).toEqual({ method: 'PUT', headers: HEADERS, body: expect.any(String) });
      expect(requestBody()).toEqual({
        message: 'Update readme',
        content: Buffer.from('Hello, wörld!\n', 'utf-8').toString('base64'),
      });
      expect(result.data).toEqual({
        file: {
          name: 'readme.md',
          path: 'docs/readme.md',
          sha: 'blob456',
          htmlUrl: 'https://github.com/octo/hello/blob/main/docs/readme.md',
        },
        commit: { sha: 'commit789', message: 'Update readme' },
      });
    });

    it('sends sha and branch when updating an existing file', async () => {
      fetchMock.mockResolvedValue(Response.json(filePayload));

      await tool.call({ ...args, sha: 'oldblob123', branch: 'feature/docs' });

      expect(requestBody()).toEqual({
        message: 'Update readme',
        content: Buffer.from('Hello, wörld!\n', 'utf-8').toString('base64'),
        sha: 'oldblob123',
        branch: 'feature/docs',
      });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(request()[0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/contents/docs/readme.md');
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
      [409, 'Conflict'],
      [422, 'Unprocessable Entity'],
    ])('reports HTTP %i as api_error', async (status, statusText) => {
      fetchMock.mockResolvedValue(new Response('{"message":"sha mismatch"}', { status, statusText }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: `GitHub API error: ${statusText}` });
      expect(result.error).toBe(`GitHub API error: ${statusText}`);
    });
  });
});
