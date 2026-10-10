import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GoogleDriveUploadFileArgs, GoogleDriveUploadFileTool } from '../google-drive-upload-file.tool.js';

describe('GoogleDriveUploadFileTool', () => {
  let module: TestingModule;
  let tool: GoogleDriveUploadFileTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();
  const boundary = 'boundary_1700000000000';

  const execute = (args: GoogleDriveUploadFileArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleDriveUploadFileTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleDriveUploadFileTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('validation', () => {
    it('requires name and content', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ name: 'a.txt' })).toThrow();
      expect(() => schema.parse({ content: 'x' })).toThrow();
      expect(() => schema.parse({ name: 'a.txt', content: 'x' })).not.toThrow();
    });

    it('defaults mimeType to text/plain', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ name: 'a.txt', content: 'x' })).toEqual({
        name: 'a.txt',
        content: 'x',
        mimeType: 'text/plain',
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ name: 'a.txt', content: 'x', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('posts a multipart/related body with metadata and content', async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 'f1', name: 'a.txt', mimeType: 'text/plain' }));

      const result = await tool.call({ name: 'a.txt', content: 'hello\nworld', mimeType: 'text/plain' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer g-token',
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: [
            `--${boundary}`,
            'Content-Type: application/json; charset=UTF-8',
            '',
            '{"name":"a.txt"}',
            `--${boundary}`,
            'Content-Type: text/plain',
            '',
            'hello\nworld',
            `--${boundary}--`,
          ].join('\r\n'),
        },
      );
      expect(result.data).toEqual({ id: 'f1', name: 'a.txt', mimeType: 'text/plain' });
    });

    it('returns the webViewLink of the created file', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ id: 'f1', name: 'a.txt', mimeType: 'text/plain', webViewLink: 'https://drive.google.com/f1' }),
      );

      const result = await tool.call({ name: 'a.txt', content: 'x', mimeType: 'text/plain' });

      expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('fields')).toBe(
        'id,name,mimeType,webViewLink',
      );
      expect(result.data).toEqual({
        id: 'f1',
        name: 'a.txt',
        mimeType: 'text/plain',
        webViewLink: 'https://drive.google.com/f1',
      });
    });

    it('adds parents and description to the metadata part and uses the given mime type', async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 'f2', name: 'data.csv', mimeType: 'text/csv' }));

      await tool.call({
        name: 'data.csv',
        content: 'a,b\n1,2',
        mimeType: 'text/csv',
        folderId: 'folder-1',
        description: 'Export',
      });

      const parts = (fetchMock.mock.calls[0][1] as RequestInit).body as string;
      const lines = parts.split('\r\n');
      expect(JSON.parse(lines[3])).toEqual({ name: 'data.csv', parents: ['folder-1'], description: 'Export' });
      expect(lines[5]).toBe('Content-Type: text/csv');
      expect(lines.slice(7)).toEqual(['a,b\n1,2', `--${boundary}--`]);
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ name: 'a.txt', content: 'x', mimeType: 'text/plain' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ name: 'a.txt', content: 'x', mimeType: 'text/plain' });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('quota', { status: 429, statusText: 'Too Many Requests' }));

      const result = await execute({ name: 'a.txt', content: 'x', mimeType: 'text/plain' });

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Drive API error: Too Many Requests' });
      expect(result.error).toBe('Google Drive API error: Too Many Requests');
    });
  });
});
