import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GmailSendMessageArgs, GmailSendMessageTool } from '../gmail-send-message.tool.js';

describe('GmailSendMessageTool', () => {
  let module: TestingModule;
  let tool: GmailSendMessageTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();
  const boundary = 'boundary_1700000000000';

  const execute = (args: GmailSendMessageArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);
  const sentRaw = (): string =>
    (JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as { raw: string }).raw;
  const decodedMessage = () => Buffer.from(sentRaw(), 'base64url').toString('utf8');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest().forTool(GmailSendMessageTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GmailSendMessageTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('validation', () => {
    it('requires to, subject and body', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ to: ['a@example.com'], subject: 'Hi' })).toThrow();
      expect(() => schema.parse({ to: ['a@example.com'], body: 'x' })).toThrow();
      expect(() => schema.parse({ subject: 'Hi', body: 'x' })).toThrow();
      expect(() => schema.parse({ to: 'a@example.com', subject: 'Hi', body: 'x' })).toThrow();
      expect(() => schema.parse({ to: ['a@example.com'], subject: 'Hi', body: 'x' })).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ to: ['a@example.com'], subject: 'Hi', body: 'x', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('sends a base64url-encoded plain-text RFC 2822 message', async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 'm1', threadId: 't1', labelIds: ['SENT'] }));

      const result = await tool.call({
        to: ['a@example.com', 'b@example.com'],
        cc: ['c@example.com'],
        bcc: ['d@example.com'],
        subject: 'Hello',
        body: 'Grüße ???>>>',
      });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: 'Bearer g-token', 'Content-Type': 'application/json' },
        body: expect.any(String) as string,
      });
      expect(sentRaw()).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(decodedMessage()).toBe(
        [
          'To: a@example.com, b@example.com',
          'Subject: Hello',
          'MIME-Version: 1.0',
          'Cc: c@example.com',
          'Bcc: d@example.com',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'Grüße ???>>>',
        ].join('\r\n'),
      );
      expect(result.data).toEqual({ id: 'm1', threadId: 't1', labelIds: ['SENT'] });
    });

    it('omits Cc and Bcc headers when the lists are empty', async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 'm1', threadId: 't1', labelIds: [] }));

      await tool.call({ to: ['a@example.com'], cc: [], bcc: [], subject: 'Hi', body: 'x' });

      expect(decodedMessage()).toBe(
        [
          'To: a@example.com',
          'Subject: Hi',
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'x',
        ].join('\r\n'),
      );
    });

    it('builds a multipart/alternative message when htmlBody is given', async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 'm1', threadId: 't1', labelIds: [] }));

      await tool.call({ to: ['a@example.com'], subject: 'Hi', body: 'plain', htmlBody: '<p>html</p>' });

      expect(decodedMessage()).toBe(
        [
          'To: a@example.com',
          'Subject: Hi',
          'MIME-Version: 1.0',
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'plain',
          `--${boundary}`,
          'Content-Type: text/html; charset="UTF-8"',
          '',
          '<p>html</p>',
          `--${boundary}--`,
        ].join('\r\n'),
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ to: ['a@example.com'], subject: 'Hi', body: 'x' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ to: ['a@example.com'], subject: 'Hi', body: 'x' });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('bad', { status: 400, statusText: 'Bad Request' }));

      const result = await execute({ to: ['a@example.com'], subject: 'Hi', body: 'x' });

      expect(result.data).toEqual({ error: 'api_error', message: 'Gmail API error: Bad Request' });
      expect(result.error).toBe('Gmail API error: Bad Request');
    });
  });
});
