import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GitHubListDirectoryArgs, GitHubListDirectoryTool } from '../github-list-directory.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListDirectoryTool', () => {
  let module: TestingModule;
  let tool: GitHubListDirectoryTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListDirectoryArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubListDirectoryTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubListDirectoryTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner and repo and defaults path to the root', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo' })).toThrow();
      expect(schema.parse({ owner: 'octo', repo: 'hello' })).toEqual({ owner: 'octo', repo: 'hello', path: '' });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists the repository root by default and maps the entries', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            name: 'README.md',
            path: 'README.md',
            sha: 'blob1',
            size: 120,
            type: 'file',
            html_url: 'https://github.com/octo/hello/blob/main/README.md',
            download_url: 'https://raw.githubusercontent.com/octo/hello/main/README.md',
          },
          {
            name: 'src',
            path: 'src',
            sha: 'tree1',
            size: 0,
            type: 'dir',
            html_url: 'https://github.com/octo/hello/tree/main/src',
            download_url: null,
          },
        ]),
      );

      const result = await tool.call({ owner: 'octo', repo: 'hello' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/contents/', { headers: HEADERS });
      expect(result.data).toEqual({
        entries: [
          {
            name: 'README.md',
            path: 'README.md',
            sha: 'blob1',
            size: 120,
            type: 'file',
            htmlUrl: 'https://github.com/octo/hello/blob/main/README.md',
          },
          {
            name: 'src',
            path: 'src',
            sha: 'tree1',
            size: 0,
            type: 'dir',
            htmlUrl: 'https://github.com/octo/hello/tree/main/src',
          },
        ],
      });
    });

    it('lists a nested path at the given ref', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      const result = await tool.call({ owner: 'octo', repo: 'hello', path: 'src/tools', ref: 'feature/x' });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/octo/hello/contents/src/tools?ref=feature%2Fx',
      );
      expect(result.data).toEqual({ entries: [] });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ owner: 'a/b', repo: 'c d', path: 'src' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/contents/src');
    });

    it('URL-encodes each segment of the path', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      await execute({ owner: 'octo', repo: 'hello', path: 'docs/a#b', ref: 'main' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/octo/hello/contents/docs/a%23b?ref=main');
    });

    it('reports not_a_directory when the path points to a file', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ type: 'file', name: 'README.md', path: 'README.md', sha: 'blob1', size: 12 }),
      );

      const result = await execute({ owner: 'octo', repo: 'hello', path: 'README.md' });

      expect(result.data).toEqual({ error: 'not_a_directory', message: "'README.md' is not a directory." });
      expect(result.error).toBe("'README.md' is not a directory.");
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
