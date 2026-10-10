import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth';
import { createToolTest } from '@loopstack/testing';
import { GoogleCalendarCreateEventArgs, GoogleCalendarCreateEventTool } from '../google-calendar-create-event.tool.js';

describe('GoogleCalendarCreateEventTool', () => {
  let module: TestingModule;
  let tool: GoogleCalendarCreateEventTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const baseArgs: GoogleCalendarCreateEventArgs = {
    calendarId: 'primary',
    summary: 'Standup',
    start: '2026-10-01T09:00:00Z',
    end: '2026-10-01T09:15:00Z',
  };

  const execute = (args: GoogleCalendarCreateEventArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleCalendarCreateEventTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleCalendarCreateEventTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires summary, start and end', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ summary: 'x', start: 'a' })).toThrow();
      expect(() => schema.parse({ start: 'a', end: 'b' })).toThrow();
      expect(() => schema.parse({ summary: 'x', start: 'a', end: 'b' })).not.toThrow();
    });

    it('defaults calendarId to primary', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({ summary: 'x', start: 'a', end: 'b' })).toEqual({
        calendarId: 'primary',
        summary: 'x',
        start: 'a',
        end: 'b',
      });
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ summary: 'x', start: 'a', end: 'b', extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('posts the minimal event body and maps the created event', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 'evt-1',
          summary: 'Standup',
          start: { dateTime: '2026-10-01T09:00:00Z' },
          end: { dateTime: '2026-10-01T09:15:00Z' },
          htmlLink: 'https://calendar.google.com/event?eid=evt-1',
        }),
      );

      const result = await tool.call(baseArgs);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: 'Bearer g-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: 'Standup',
          start: { dateTime: '2026-10-01T09:00:00Z' },
          end: { dateTime: '2026-10-01T09:15:00Z' },
        }),
      });
      expect(result.data).toEqual({
        event: {
          id: 'evt-1',
          summary: 'Standup',
          start: '2026-10-01T09:00:00Z',
          end: '2026-10-01T09:15:00Z',
          htmlLink: 'https://calendar.google.com/event?eid=evt-1',
        },
      });
    });

    it('includes optional fields and URL-encodes the calendar id', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          id: 'evt-2',
          summary: 'Offsite',
          start: { date: '2026-10-02' },
          end: { date: '2026-10-03' },
          htmlLink: 'link',
        }),
      );

      const result = await tool.call({
        ...baseArgs,
        calendarId: 'team@group.calendar.google.com',
        summary: 'Offsite',
        description: 'Planning',
        location: 'Berlin',
        attendees: [{ email: 'a@example.com' }],
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/team%40group.calendar.google.com/events');
      expect(JSON.parse(init.body as string)).toEqual({
        summary: 'Offsite',
        start: { dateTime: '2026-10-01T09:00:00Z' },
        end: { dateTime: '2026-10-01T09:15:00Z' },
        description: 'Planning',
        location: 'Berlin',
        attendees: [{ email: 'a@example.com' }],
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
      });
      expect(result.data).toEqual({
        event: { id: 'evt-2', summary: 'Offsite', start: '2026-10-02', end: '2026-10-03', htmlLink: 'link' },
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
      fetchMock.mockResolvedValue(new Response('bad', { status: 400, statusText: 'Bad Request' }));

      const result = await execute(baseArgs);

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Calendar API error: Bad Request' });
      expect(result.error).toBe('Google Calendar API error: Bad Request');
    });
  });
});
