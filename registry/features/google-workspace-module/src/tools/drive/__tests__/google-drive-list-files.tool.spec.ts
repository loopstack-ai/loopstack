import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GoogleDriveListFilesArgs, GoogleDriveListFilesTool } from '../google-drive-list-files.tool.js';

describe('GoogleDriveListFilesTool', () => {
  let module: TestingModule;
  let tool: GoogleDriveListFilesTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();
  const fields = 'files(id,name,mimeType,size,modifiedTime,createdTime,owners,webViewLink,parents),nextPageToken';

  const execute = (args: GoogleDriveListFilesArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleDriveListFilesTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleDriveListFilesTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('accepts empty args and defaults maxResults to 20', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({})).toEqual({ maxResults: 20 });
      expect(() => schema.parse({ maxResults: '5' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists files with page size and fields and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          files: [
            {
              id: 'f1',
              name: 'a.txt',
              mimeType: 'text/plain',
              size: '10',
              modifiedTime: 'm1',
              createdTime: 'c1',
              owners: [{ displayName: 'Alice', emailAddress: 'alice@example.com' }],
              webViewLink: 'link-1',
              parents: ['root'],
            },
          ],
          nextPageToken: 'next-1',
        }),
      );

      const result = await tool.call({ maxResults: 20 });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith(
        `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ pageSize: '20', fields }).toString()}`,
        { headers: { Authorization: 'Bearer g-token' } },
      );
      expect(result.data).toEqual({
        files: [
          {
            id: 'f1',
            name: 'a.txt',
            mimeType: 'text/plain',
            size: '10',
            modifiedTime: 'm1',
            createdTime: 'c1',
            owners: [{ displayName: 'Alice', email: 'alice@example.com' }],
            webViewLink: 'link-1',
          },
        ],
        nextPageToken: 'next-1',
      });
    });

    it('combines query and folder into q and forwards paging and ordering', async () => {
      fetchMock.mockResolvedValue(Response.json({ files: [] }));

      const result = await tool.call({
        query: "name contains 'report'",
        folderId: 'folder-1',
        maxResults: 5,
        pageToken: 'tok',
        orderBy: 'modifiedTime desc',
      });

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        pageSize: '5',
        fields,
        q: "name contains 'report' and 'folder-1' in parents",
        pageToken: 'tok',
        orderBy: 'modifiedTime desc',
      });
      expect(result.data).toEqual({ files: [], nextPageToken: undefined });
    });

    it('uses only the folder clause when no query is given', async () => {
      fetchMock.mockResolvedValue(Response.json({ files: [] }));

      await tool.call({ folderId: 'folder-1', maxResults: 20 });

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('q')).toBe("'folder-1' in parents");
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ maxResults: 20 });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ maxResults: 20 });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('bad', { status: 400, statusText: 'Bad Request' }));

      const result = await execute({ maxResults: 20 });

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Drive API error: Bad Request' });
      expect(result.error).toBe('Google Drive API error: Bad Request');
    });
  });
});
