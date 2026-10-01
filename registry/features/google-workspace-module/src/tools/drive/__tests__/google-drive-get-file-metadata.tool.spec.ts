import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import {
  GoogleDriveGetFileMetadataArgs,
  GoogleDriveGetFileMetadataTool,
} from '../google-drive-get-file-metadata.tool.js';

describe('GoogleDriveGetFileMetadataTool', () => {
  let module: TestingModule;
  let tool: GoogleDriveGetFileMetadataTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GoogleDriveGetFileMetadataArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleDriveGetFileMetadataTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleDriveGetFileMetadataTool);
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
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ fileId: 'f1', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('requests the metadata fields and maps owners to email', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 'f1',
          name: 'report.pdf',
          mimeType: 'application/pdf',
          size: '2048',
          modifiedTime: '2026-01-02T00:00:00Z',
          createdTime: '2026-01-01T00:00:00Z',
          owners: [{ displayName: 'Alice', emailAddress: 'alice@example.com', kind: 'drive#user' }],
          webViewLink: 'https://drive.google.com/file/d/f1/view',
          parents: ['folder-1'],
          description: 'Q3',
          shared: true,
          permissions: [{ id: 'p1' }],
        }),
      );

      const result = await tool.call({ fileId: 'f1' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/f1?fields=id,name,mimeType,size,modifiedTime,createdTime,owners,webViewLink,parents,description,shared,permissions',
        { headers: { Authorization: 'Bearer g-token' } },
      );
      expect(result.data).toEqual({
        id: 'f1',
        name: 'report.pdf',
        mimeType: 'application/pdf',
        size: '2048',
        modifiedTime: '2026-01-02T00:00:00Z',
        createdTime: '2026-01-01T00:00:00Z',
        owners: [{ displayName: 'Alice', email: 'alice@example.com' }],
        webViewLink: 'https://drive.google.com/file/d/f1/view',
        parents: ['folder-1'],
        description: 'Q3',
        shared: true,
      });
    });

    it('leaves absent optional fields undefined', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 'f2',
          name: 'Folder',
          mimeType: 'application/vnd.google-apps.folder',
          modifiedTime: 'm',
          createdTime: 'c',
        }),
      );

      const result = await tool.call({ fileId: 'f2' });

      expect(result.data).toStrictEqual({
        id: 'f2',
        name: 'Folder',
        mimeType: 'application/vnd.google-apps.folder',
        size: undefined,
        modifiedTime: 'm',
        createdTime: 'c',
        owners: undefined,
        webViewLink: undefined,
        parents: undefined,
        description: undefined,
        shared: undefined,
      });
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

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ fileId: 'f1' });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute({ fileId: 'f1' });

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Drive API error: Not Found' });
      expect(result.error).toBe('Google Drive API error: Not Found');
    });
  });
});
