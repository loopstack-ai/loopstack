import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GmailSearchMessagesArgs, GmailSearchMessagesTool } from '../gmail-search-messages.tool.js';

describe('GmailSearchMessagesTool', () => {
  let module: TestingModule;
  let tool: GmailSearchMessagesTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();
  const metadataUrl = (id: string) =>
    `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`;

  const execute = (args: GmailSearchMessagesArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GmailSearchMessagesTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GmailSearchMessagesTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('accepts empty args and defaults maxResults to 10', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({})).toEqual({ maxResults: 10 });
      expect(() => schema.parse({ labelIds: 'INBOX' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists matching messages and fetches metadata for each', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.startsWith('https://www.googleapis.com/gmail/v1/users/me/messages?')) {
          return Promise.resolve(
            Response.json({
              messages: [
                { id: 'm1', threadId: 't1' },
                { id: 'm2', threadId: 't2' },
              ],
              nextPageToken: 'next-1',
            }),
          );
        }
        if (url === metadataUrl('m1')) {
          return Promise.resolve(
            Response.json({
              id: 'm1',
              threadId: 't1',
              snippet: 'First',
              payload: {
                headers: [
                  { name: 'FROM', value: 'alice@example.com' },
                  { name: 'To', value: 'me@example.com' },
                  { name: 'subject', value: 'Hello' },
                  { name: 'Date', value: 'Thu, 1 Oct 2026 10:00:00 +0000' },
                ],
              },
            }),
          );
        }
        return Promise.resolve(new Response('gone', { status: 404 }));
      });

      const result = await tool.call({
        query: 'from:alice is:unread',
        labelIds: ['INBOX', 'IMPORTANT'],
        maxResults: 5,
        pageToken: 'p1',
      });

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      const listUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(listUrl.origin + listUrl.pathname).toBe('https://www.googleapis.com/gmail/v1/users/me/messages');
      expect(listUrl.searchParams.get('maxResults')).toBe('5');
      expect(listUrl.searchParams.get('q')).toBe('from:alice is:unread');
      expect(listUrl.searchParams.get('pageToken')).toBe('p1');
      expect(listUrl.searchParams.getAll('labelIds')).toEqual(['INBOX', 'IMPORTANT']);
      expect(fetchMock).toHaveBeenCalledWith(metadataUrl('m1'), { headers: { Authorization: 'Bearer g-token' } });
      expect(fetchMock).toHaveBeenCalledWith(metadataUrl('m2'), { headers: { Authorization: 'Bearer g-token' } });
      expect(result.data).toEqual({
        messages: [
          {
            id: 'm1',
            threadId: 't1',
            snippet: 'First',
            from: 'alice@example.com',
            to: 'me@example.com',
            subject: 'Hello',
            date: 'Thu, 1 Oct 2026 10:00:00 +0000',
          },
          { id: 'm2', threadId: 't2', snippet: '', from: '', to: '', subject: '', date: '' },
        ],
        nextPageToken: 'next-1',
      });
    });

    it('sends only maxResults when no filters are given', async () => {
      fetchMock.mockResolvedValue(Response.json({}));

      await tool.call({ maxResults: 10 });

      expect(fetchMock).toHaveBeenCalledWith('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: { Authorization: 'Bearer g-token' },
      });
    });

    it.each([{}, { messages: [] }])('returns an empty list without metadata requests for %j', async (body) => {
      fetchMock.mockResolvedValue(Response.json({ ...body, nextPageToken: 'n' }));

      const result = await tool.call({ maxResults: 10 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ messages: [], nextPageToken: 'n' });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({ maxResults: 10 });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({ maxResults: 10 });

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('bad', { status: 400, statusText: 'Bad Request' }));

      const result = await execute({ maxResults: 10 });

      expect(result.data).toEqual({ error: 'api_error', message: 'Gmail API error: Bad Request' });
      expect(result.error).toBe('Gmail API error: Bad Request');
    });
  });
});
