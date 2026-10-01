import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubGetFileContentArgs, GitHubGetFileContentTool } from '../github-get-file-content.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const args = { owner: 'octo', repo: 'hello', path: 'src/index.ts' };

const text = 'export const greeting = "héllo";\n';

const filePayload = {
  type: 'file',
  encoding: 'base64',
  size: 34,
  name: 'index.ts',
  path: 'src/index.ts',
  // GitHub wraps base64 content at 60 characters.
  content: (
    Buffer.from(text, 'utf-8')
      .toString('base64')
      .match(/.{1,60}/g) ?? []
  ).join('\n'),
  sha: 'blob123',
  html_url: 'https://github.com/octo/hello/blob/main/src/index.ts',
};

describe('GitHubGetFileContentTool', () => {
  let module: TestingModule;
  let tool: GitHubGetFileContentTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubGetFileContentArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubGetFileContentTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GitHubGetFileContentTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo and path', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello' })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
      expect(() => schema.parse({ ...args, ref: 'main' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the file and decodes its base64 content', async () => {
      fetchMock.mockResolvedValue(Response.json(filePayload));

      const result = await tool.call(args);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/octo/hello/contents/src/index.ts', {
        headers: HEADERS,
      });
      expect(result.data).toEqual({
        file: {
          name: 'index.ts',
          path: 'src/index.ts',
          sha: 'blob123',
          size: 34,
          type: 'file',
          content: text,
          htmlUrl: 'https://github.com/octo/hello/blob/main/src/index.ts',
        },
      });
    });

    it('passes ref as a query parameter', async () => {
      fetchMock.mockResolvedValue(Response.json(filePayload));

      await tool.call({ ...args, ref: 'release/1.0' });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.github.com/repos/octo/hello/contents/src/index.ts?ref=release%2F1.0',
      );
    });

    it('returns null content when the content is not base64-encoded', async () => {
      fetchMock.mockResolvedValue(Response.json({ ...filePayload, size: 2_000_000, encoding: 'none', content: '' }));

      const result = await tool.call(args);

      expect(result.data).toMatchObject({ file: { content: null, size: 2_000_000 } });
    });

    it('returns null content when the entry has no content', async () => {
      const { content: _content, encoding: _encoding, ...symlink } = filePayload;
      fetchMock.mockResolvedValue(Response.json({ ...symlink, type: 'symlink' }));

      const result = await tool.call(args);

      expect(result.data).toMatchObject({ file: { type: 'symlink', content: null } });
    });

    it('URL-encodes owner and repo', async () => {
      fetchMock.mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/contents/src/index.ts');
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

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });
  });
});
