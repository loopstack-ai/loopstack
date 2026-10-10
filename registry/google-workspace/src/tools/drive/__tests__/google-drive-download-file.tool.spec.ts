import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GoogleDriveDownloadFileArgs, GoogleDriveDownloadFileTool } from '../google-drive-download-file.tool.js';

describe('GoogleDriveDownloadFileTool', () => {
  let module: TestingModule;
  let tool: GoogleDriveDownloadFileTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();
  const headers = { Authorization: 'Bearer g-token' };

  const execute = (args: GoogleDriveDownloadFileArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleDriveDownloadFileTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleDriveDownloadFileTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires fileId', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ fileId: 'f1' })).not.toThrow();
      expect(() => schema.parse({ fileId: 'f1', exportMimeType: 'application/pdf' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ fileId: 'f1', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('downloads a regular text file via alt=media and returns it as text', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'text/plain', name: 'notes.txt' }))
        .mockResolvedValueOnce(new Response('hello drive'));

      const result = await tool.call({ fileId: 'f1' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://www.googleapis.com/drive/v3/files/f1?fields=mimeType,name',
        {
          headers,
        },
      );
      expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://www.googleapis.com/drive/v3/files/f1?alt=media', {
        headers,
      });
      expect(result.data).toEqual({ content: 'hello drive', mimeType: 'text/plain' });
    });

    it('returns JSON files as text', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'application/json', name: 'a.json' }))
        .mockResolvedValueOnce(new Response('{"a":1}'));

      const result = await tool.call({ fileId: 'f1' });

      expect(result.data).toEqual({ content: '{"a":1}', mimeType: 'application/json' });
    });

    it('returns binary files base64-encoded', async () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'image/png', name: 'a.png' }))
        .mockResolvedValueOnce(new Response(bytes));

      const result = await tool.call({ fileId: 'f1' });

      expect(result.data).toEqual({
        content: Buffer.from(bytes).toString('base64'),
        mimeType: 'image/png',
        encoding: 'base64',
      });
    });

    it('ignores exportMimeType for files that are not Google Docs', async () => {
      const bytes = new Uint8Array([0x25, 0x50, 0xff, 0xfe, 0x00]);
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'application/pdf', name: 'a.pdf' }))
        .mockResolvedValueOnce(new Response(bytes));

      const result = await tool.call({ fileId: 'f1', exportMimeType: 'text/plain' });

      expect(fetchMock.mock.calls[1][0]).toBe('https://www.googleapis.com/drive/v3/files/f1?alt=media');
      expect(result.data).toEqual({
        content: Buffer.from(bytes).toString('base64'),
        mimeType: 'application/pdf',
        encoding: 'base64',
      });
    });

    it('encodes the file id as a single path segment', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'application/vnd.google-apps.document', name: 'doc' }))
        .mockResolvedValueOnce(new Response('exported'))
        .mockResolvedValueOnce(Response.json({ mimeType: 'text/plain', name: 'a.txt' }))
        .mockResolvedValueOnce(new Response('raw'));

      await tool.call({ fileId: 'abc?x=1#' });
      await tool.call({ fileId: 'abc?x=1#' });

      expect(fetchMock.mock.calls.map((call) => call[0] as string)).toEqual([
        'https://www.googleapis.com/drive/v3/files/abc%3Fx%3D1%23?fields=mimeType,name',
        'https://www.googleapis.com/drive/v3/files/abc%3Fx%3D1%23/export?mimeType=text%2Fplain',
        'https://www.googleapis.com/drive/v3/files/abc%3Fx%3D1%23?fields=mimeType,name',
        'https://www.googleapis.com/drive/v3/files/abc%3Fx%3D1%23?alt=media',
      ]);
    });

    it.each([
      ['application/vnd.google-apps.document', 'text/plain'],
      ['application/vnd.google-apps.spreadsheet', 'text/csv'],
      ['application/vnd.google-apps.presentation', 'text/plain'],
    ])('exports %s with the default mime type %s', async (sourceMimeType, exportMimeType) => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: sourceMimeType, name: 'doc' }))
        .mockResolvedValueOnce(new Response('exported'));

      const result = await tool.call({ fileId: 'doc-1' });

      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `https://www.googleapis.com/drive/v3/files/doc-1/export?mimeType=${encodeURIComponent(exportMimeType)}`,
        { headers },
      );
      expect(result.data).toEqual({ content: 'exported', mimeType: exportMimeType });
    });

    it('exports a Google Doc with an explicit binary mime type as base64', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'application/vnd.google-apps.document', name: 'doc' }))
        .mockResolvedValueOnce(new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46])));

      const result = await tool.call({ fileId: 'doc-1', exportMimeType: 'application/pdf' });

      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://www.googleapis.com/drive/v3/files/doc-1/export?mimeType=application%2Fpdf',
      );
      expect(result.data).toEqual({ content: 'JVBERg==', mimeType: 'application/pdf', encoding: 'base64' });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ fileId: 'f1' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on the metadata request (HTTP %i)', async (status) => {
      fetchMock.mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute({ fileId: 'f1' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports a failed metadata request as api_error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute({ fileId: 'f1' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ error: 'api_error', message: 'Google Drive API error: Not Found' });
      expect(result.error).toBe('Google Drive API error: Not Found');
    });

    it.each([401, 403])('reports a rejected token on the download request (HTTP %i)', async (status) => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'text/plain', name: 'a.txt' }))
        .mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute({ fileId: 'f1' });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports a failed download as api_error', async () => {
      fetchMock
        .mockResolvedValueOnce(Response.json({ mimeType: 'application/vnd.google-apps.document', name: 'doc' }))
        .mockResolvedValueOnce(new Response('too large', { status: 413, statusText: 'Payload Too Large' }));

      const result = await execute({ fileId: 'f1' });

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Drive API error: Payload Too Large' });
      expect(result.error).toBe('Google Drive API error: Payload Too Large');
    });
  });
});
