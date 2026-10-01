import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GoogleCalendarFetchEventsArgs, GoogleCalendarFetchEventsTool } from '../google-calendar-fetch-events.tool.js';

describe('GoogleCalendarFetchEventsTool', () => {
  let module: TestingModule;
  let tool: GoogleCalendarFetchEventsTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const baseArgs: GoogleCalendarFetchEventsArgs = {
    calendarId: 'primary',
    timeMin: '2026-10-01T00:00:00Z',
    timeMax: '2026-10-02T00:00:00Z',
  };

  const execute = (args: GoogleCalendarFetchEventsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleCalendarFetchEventsTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleCalendarFetchEventsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires timeMin and timeMax', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ timeMin: 'a' })).toThrow();
      expect(() => schema.parse({ timeMax: 'b' })).toThrow();
      expect(() => schema.parse({ timeMin: 'a', timeMax: 'b' })).not.toThrow();
    });

    it('defaults calendarId to primary', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ timeMin: 'a', timeMax: 'b' })).toEqual({
        calendarId: 'primary',
        timeMin: 'a',
        timeMax: 'b',
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ timeMin: 'a', timeMax: 'b', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('fetches single events ordered by start time and maps them', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          items: [
            {
              id: 'e1',
              summary: 'Standup',
              description: 'Daily',
              start: { dateTime: '2026-10-01T09:00:00Z' },
              end: { dateTime: '2026-10-01T09:15:00Z' },
              location: 'Room 1',
              attendees: [{ email: 'a@example.com', responseStatus: 'accepted', self: true }],
              htmlLink: 'link-1',
            },
            { id: 'e2', start: { date: '2026-10-01' }, end: { date: '2026-10-02' } },
          ],
        }),
      );

      const result = await tool.call(baseArgs);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=2026-10-01T00%3A00%3A00Z&timeMax=2026-10-02T00%3A00%3A00Z&singleEvents=true&orderBy=startTime',
        { headers: { Authorization: 'Bearer g-token' } },
      );
      expect(result.data).toEqual({
        events: [
          {
            id: 'e1',
            summary: 'Standup',
            description: 'Daily',
            start: '2026-10-01T09:00:00Z',
            end: '2026-10-01T09:15:00Z',
            location: 'Room 1',
            attendees: [{ email: 'a@example.com', responseStatus: 'accepted' }],
            htmlLink: 'link-1',
          },
          {
            id: 'e2',
            summary: undefined,
            description: undefined,
            start: '2026-10-01',
            end: '2026-10-02',
            location: undefined,
            attendees: undefined,
            htmlLink: undefined,
          },
        ],
      });
    });

    it('adds maxResults and q, and URL-encodes the calendar id', async () => {
      fetchMock.mockResolvedValue(Response.json({ items: [] }));

      await tool.call({ ...baseArgs, calendarId: 'team@group', maxResults: 5, query: 'demo day' });

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toBe('/calendar/v3/calendars/team%40group/events');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        timeMin: '2026-10-01T00:00:00Z',
        timeMax: '2026-10-02T00:00:00Z',
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '5',
        q: 'demo day',
      });
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

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute(baseArgs);

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(baseArgs);

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Calendar API error: Not Found' });
      expect(result.error).toBe('Google Calendar API error: Not Found');
    });
  });
});
