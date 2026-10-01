import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import {
  GoogleCalendarListCalendarsArgs,
  GoogleCalendarListCalendarsTool,
} from '../google-calendar-list-calendars.tool.js';

describe('GoogleCalendarListCalendarsTool', () => {
  let module: TestingModule;
  let tool: GoogleCalendarListCalendarsTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GoogleCalendarListCalendarsArgs) =>
    module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('g-token');

    module = await createToolTest()
      .forTool(GoogleCalendarListCalendarsTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleCalendarListCalendarsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('accepts empty args and an optional showHidden flag', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({})).not.toThrow();
      expect(() => schema.parse({ showHidden: true })).not.toThrow();
      expect(() => schema.parse({ showHidden: 'yes' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists calendars and defaults primary to false', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          items: [
            { id: 'me@example.com', summary: 'Me', primary: true, timeZone: 'Europe/Berlin' },
            { id: 'team@group', summary: 'Team', description: 'Shared' },
          ],
        }),
      );

      const result = await tool.call({});

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
      expect(fetchMock).toHaveBeenCalledWith('https://www.googleapis.com/calendar/v3/users/me/calendarList?', {
        headers: { Authorization: 'Bearer g-token' },
      });
      expect(result.data).toEqual({
        calendars: [
          { id: 'me@example.com', summary: 'Me', description: undefined, primary: true, timeZone: 'Europe/Berlin' },
          { id: 'team@group', summary: 'Team', description: 'Shared', primary: false, timeZone: undefined },
        ],
      });
    });

    it('adds showHidden=true when requested', async () => {
      fetchMock.mockResolvedValue(Response.json({ items: [] }));

      await tool.call({ showHidden: true });

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=true',
      );
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({});

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid Google token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({});

      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'Google token was rejected. Please re-authenticate.',
      });
      expect(result.error).toBe('Google token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }));

      const result = await execute({});

      expect(result.data).toEqual({ error: 'api_error', message: 'Google Calendar API error: Internal Server Error' });
      expect(result.error).toBe('Google Calendar API error: Internal Server Error');
    });
  });
});
