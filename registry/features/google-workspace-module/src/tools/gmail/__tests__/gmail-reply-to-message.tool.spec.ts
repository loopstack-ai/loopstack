import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GmailReplyToMessageArgs, GmailReplyToMessageTool } from '../gmail-reply-to-message.tool.js';

describe('GmailReplyToMessageTool', () => {
  let module: TestingModule;
  let tool: GmailReplyToMessageTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();
  const boundary = 'boundary_1700000000000';
  const baseArgs: GmailReplyToMessageArgs = { messageId: 'm1', threadId: 't1', body: 'Thanks!', replyAll: false };

  const original = (headers: Record<string, string>) =>
    Response.json({ payload: { headers: Object.entries(headers).map(([name, value]) => ({ name, value })) } });
  const defaultOriginal = () =>
    original({
      From: 'Alice <alice@example.com>',
      To: 'me@example.com, bob@example.com',
      Cc: 'carol@example.com',
      Subject: 'Plans',
      'Message-ID': '<orig-1@mail.example.com>',
    });

  const execute = (args: GmailReplyToMessageArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);
  const sentBody = () =>
    JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string) as { raw: string; threadId: string };
  const decodedMessage = () => Buffer.from(sentBody().raw, 'base64url').toString('utf8');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GmailReplyToMessageTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GmailReplyToMessageTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('validation', () => {
    it('requires messageId, threadId and body', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ messageId: 'm1', threadId: 't1' })).toThrow();
      expect(() => schema.parse({ messageId: 'm1', body: 'x' })).toThrow();
      expect(() => schema.parse({ threadId: 't1', body: 'x' })).toThrow();
      expect(() => schema.parse({ messageId: 'm1', threadId: 't1', body: 'x' })).not.toThrow();
    });

    it('defaults replyAll to false', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ messageId: 'm1', threadId: 't1', body: 'x' })).toEqual({
        messageId: 'm1',
        threadId: 't1',
        body: 'x',
        replyAll: false,
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ messageId: 'm1', threadId: 't1', body: 'x', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches the original headers and sends a threaded reply to the sender', async () => {
      fetchMock
        .mockResolvedValueOnce(defaultOriginal())
        .mockResolvedValueOnce(Response.json({ id: 'r1', threadId: 't1', labelIds: ['SENT'] }));

      const result = await tool.call(baseArgs);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://www.googleapis.com/gmail/v1/users/me/messages/m1?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Message-ID',
        { headers: { Authorization: 'Bearer g-token' } },
      );
      expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: 'Bearer g-token', 'Content-Type': 'application/json' },
        body: expect.any(String) as string,
      });
      expect(sentBody().threadId).toBe('t1');
      expect(sentBody().raw).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(decodedMessage()).toBe(
        [
          'To: Alice <alice@example.com>',
          'Subject: Re: Plans',
          'In-Reply-To: <orig-1@mail.example.com>',
          'References: <orig-1@mail.example.com>',
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'Thanks!',
        ].join('\r\n'),
      );
      expect(result.data).toEqual({ id: 'r1', threadId: 't1', labelIds: ['SENT'] });
    });

    it('replies to sender and recipients with the original Cc when replyAll is set', async () => {
      fetchMock
        .mockResolvedValueOnce(defaultOriginal())
        .mockResolvedValueOnce(Response.json({ id: 'r1', threadId: 't1', labelIds: [] }));

      await tool.call({ ...baseArgs, replyAll: true });

      const headers = decodedMessage().split('\r\n\r\n')[0].split('\r\n');
      expect(headers).toContain('To: Alice <alice@example.com>, me@example.com, bob@example.com');
      expect(headers).toContain('Cc: carol@example.com');
    });

    it('does not repeat an existing Re: prefix and matches headers case-insensitively', async () => {
      fetchMock
        .mockResolvedValueOnce(
          original({ from: 'alice@example.com', subject: 'Re: Plans', 'message-id': '<orig-2@mail.example.com>' }),
        )
        .mockResolvedValueOnce(Response.json({ id: 'r1', threadId: 't1', labelIds: [] }));

      await tool.call({ ...baseArgs, replyAll: true });

      const headers = decodedMessage().split('\r\n\r\n')[0].split('\r\n');
      expect(headers).toEqual([
        'To: alice@example.com',
        'Subject: Re: Plans',
        'In-Reply-To: <orig-2@mail.example.com>',
        'References: <orig-2@mail.example.com>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
      ]);
    });

    it('builds a multipart/alternative reply when htmlBody is given', async () => {
      fetchMock
        .mockResolvedValueOnce(defaultOriginal())
        .mockResolvedValueOnce(Response.json({ id: 'r1', threadId: 't1', labelIds: [] }));

      await tool.call({ ...baseArgs, htmlBody: '<p>Thanks!</p>' });

      expect(decodedMessage()).toBe(
        [
          'To: Alice <alice@example.com>',
          'Subject: Re: Plans',
          'In-Reply-To: <orig-1@mail.example.com>',
          'References: <orig-1@mail.example.com>',
          'MIME-Version: 1.0',
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'Thanks!',
          `--${boundary}`,
          'Content-Type: text/html; charset="UTF-8"',
          '',
          '<p>Thanks!</p>',
          `--${boundary}--`,
        ].join('\r\n'),
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute(baseArgs);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token when fetching the original (HTTP %i)', async (status) => {
      fetchMock.mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute(baseArgs);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports a failed original fetch as api_error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(baseArgs);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ error: 'api_error', message: 'Gmail API error: Not Found' });
      expect(result.error).toBe('Gmail API error: Not Found');
    });

    it.each([401, 403])('reports a rejected token when sending (HTTP %i)', async (status) => {
      fetchMock.mockResolvedValueOnce(defaultOriginal()).mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute(baseArgs);

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports a failed send as api_error', async () => {
      fetchMock
        .mockResolvedValueOnce(defaultOriginal())
        .mockResolvedValueOnce(new Response('bad', { status: 400, statusText: 'Bad Request' }));

      const result = await execute(baseArgs);

      expect(result.data).toEqual({ error: 'api_error', message: 'Gmail API error: Bad Request' });
      expect(result.error).toBe('Gmail API error: Bad Request');
    });
  });
});
