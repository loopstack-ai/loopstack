import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GmailGetMessageArgs, GmailGetMessageTool } from '../gmail-get-message.tool.js';

describe('GmailGetMessageTool', () => {
  let module: TestingModule;
  let tool: GmailGetMessageTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const b64url = (text: string) => Buffer.from(text, 'utf8').toString('base64url');
  const message = (payload: Record<string, unknown>) =>
    Response.json({ id: 'm1', threadId: 't1', snippet: 'Hi there', labelIds: ['INBOX', 'UNREAD'], payload });

  const execute = (args: GmailGetMessageArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest().forTool(GmailGetMessageTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GmailGetMessageTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires messageId', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ messageId: 'm1' })).not.toThrow();
    });

    it('defaults format to full and rejects unknown formats', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ messageId: 'm1' })).toEqual({ messageId: 'm1', format: 'full' });
      expect(() => schema.parse({ messageId: 'm1', format: 'raw' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ messageId: 'm1', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the message and extracts headers, a plain-text body and attachments', async () => {
      fetchMock.mockResolvedValue(
        message({
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'from', value: 'Alice <alice@example.com>' },
            { name: 'TO', value: 'me@example.com' },
            { name: 'Cc', value: 'bob@example.com' },
            { name: 'Subject', value: 'Report' },
            { name: 'Date', value: 'Thu, 1 Oct 2026 10:00:00 +0000' },
          ],
          body: { size: 0 },
          parts: [
            {
              mimeType: 'multipart/alternative',
              body: { size: 0 },
              parts: [
                { mimeType: 'text/plain', body: { size: 12, data: b64url('Grüße ???>>>') } },
                { mimeType: 'text/html', body: { size: 20, data: b64url('<p>Grüße</p>') } },
              ],
            },
            {
              mimeType: 'application/pdf',
              filename: 'report.pdf',
              body: { attachmentId: 'att-1', size: 2048 },
            },
          ],
        }),
      );

      const result = await tool.call({ messageId: 'm1', format: 'full' });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith('https://www.googleapis.com/gmail/v1/users/me/messages/m1?format=full', {
        headers: { Authorization: 'Bearer g-token' },
      });
      expect(result.data).toEqual({
        id: 'm1',
        threadId: 't1',
        from: 'Alice <alice@example.com>',
        to: 'me@example.com',
        cc: 'bob@example.com',
        subject: 'Report',
        date: 'Thu, 1 Oct 2026 10:00:00 +0000',
        body: 'Grüße ???>>>',
        snippet: 'Hi there',
        labelIds: ['INBOX', 'UNREAD'],
        attachments: [{ attachmentId: 'att-1', filename: 'report.pdf', mimeType: 'application/pdf', size: 2048 }],
      });
    });

    it('decodes a top-level text/plain body and defaults missing headers to empty strings', async () => {
      fetchMock.mockResolvedValue(message({ mimeType: 'text/plain', body: { size: 5, data: b64url('hello') } }));

      const result = await tool.call({ messageId: 'm1', format: 'full' });

      expect(result.data).toMatchObject({
        from: '',
        to: '',
        cc: '',
        subject: '',
        date: '',
        body: 'hello',
        attachments: [],
      });
    });

    it('prefers a direct text/plain child over the html alternative', async () => {
      fetchMock.mockResolvedValue(
        message({
          mimeType: 'multipart/alternative',
          headers: [],
          body: { size: 0 },
          parts: [
            { mimeType: 'text/html', body: { size: 9, data: b64url('<b>hi</b>') } },
            { mimeType: 'text/plain', body: { size: 2, data: b64url('hi') } },
          ],
        }),
      );

      const result = await tool.call({ messageId: 'm1', format: 'full' });

      expect(result.data).toMatchObject({ body: 'hi' });
    });

    it('falls back to the html body when no plain-text part exists', async () => {
      fetchMock.mockResolvedValue(
        message({
          mimeType: 'multipart/alternative',
          headers: [],
          body: { size: 0 },
          parts: [{ mimeType: 'text/html', body: { size: 9, data: b64url('<b>hi</b>') } }],
        }),
      );

      const result = await tool.call({ messageId: 'm1', format: 'full' });

      expect(result.data).toMatchObject({ body: '<b>hi</b>' });
    });

    it('returns an empty body when the payload has no body data', async () => {
      fetchMock.mockResolvedValue(
        message({ mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'Meta' }], body: { size: 0 } }),
      );

      const result = await tool.call({ messageId: 'm1', format: 'metadata' });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://www.googleapis.com/gmail/v1/users/me/messages/m1?format=metadata',
      );
      expect(result.data).toMatchObject({ subject: 'Meta', body: '' });
    });

    it('returns empty headers, body and attachments for a minimal message without payload', async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 'm1', threadId: 't1', snippet: 'Hi', labelIds: ['INBOX'] }));

      const result = await tool.call({ messageId: 'm1', format: 'minimal' });

      expect(result.data).toEqual({
        id: 'm1',
        threadId: 't1',
        from: '',
        to: '',
        cc: '',
        subject: '',
        date: '',
        body: '',
        snippet: 'Hi',
        labelIds: ['INBOX'],
        attachments: [],
      });
    });

    it('encodes the message id as a single path segment', async () => {
      fetchMock.mockResolvedValue(message({ mimeType: 'text/plain', body: { size: 0 } }));

      await tool.call({ messageId: '../../profile?x=', format: 'full' });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://www.googleapis.com/gmail/v1/users/me/messages/..%2F..%2Fprofile%3Fx%3D?format=full',
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ messageId: 'm1', format: 'full' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ messageId: 'm1', format: 'full' });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute({ messageId: 'm1', format: 'full' });

      expect(result.data).toEqual({ error: 'api_error', message: 'Gmail API error: Not Found' });
      expect(result.error).toBe('Gmail API error: Not Found');
    });
  });
});
