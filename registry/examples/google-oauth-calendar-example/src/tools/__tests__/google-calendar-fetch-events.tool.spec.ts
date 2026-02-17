import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { RunContext, getBlockArgsSchema, getBlockConfig } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GoogleCalendarFetchEventsTool } from '../google-calendar-fetch-events.tool';

describe('GoogleCalendarFetchEventsTool', () => {
  let module: TestingModule;
  let tool: GoogleCalendarFetchEventsTool;

  const mockTokenStore = {
    getValidAccessToken: jest.fn(),
    storeTokens: jest.fn(),
    storeFromTokenSet: jest.fn(),
    getTokens: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createToolTest()
      .forTool(GoogleCalendarFetchEventsTool)
      .withMock(OAuthTokenStore, mockTokenStore)
      .compile();

    tool = module.get(GoogleCalendarFetchEventsTool);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(tool).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(getBlockArgsSchema(tool)).toBeDefined();
      expect(getBlockArgsSchema(tool)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(tool)).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate correct input', () => {
      const schema = getBlockArgsSchema(tool)!;
      const result = schema.parse({
        timeMin: '2025-01-01T00:00:00Z',
        timeMax: '2025-01-07T23:59:59Z',
      });
      expect(result).toEqual({
        timeMin: '2025-01-01T00:00:00Z',
        timeMax: '2025-01-07T23:59:59Z',
        calendarId: 'primary',
      });
    });

    it('should apply default calendarId', () => {
      const schema = getBlockArgsSchema(tool)!;
      const result = schema.parse({
        timeMin: '2025-01-01T00:00:00Z',
        timeMax: '2025-01-07T23:59:59Z',
      }) as Record<string, unknown>;
      expect(result.calendarId).toBe('primary');
    });

    it('should accept custom calendarId', () => {
      const schema = getBlockArgsSchema(tool)!;
      const result = schema.parse({
        timeMin: '2025-01-01T00:00:00Z',
        timeMax: '2025-01-07T23:59:59Z',
        calendarId: 'my-calendar@group.calendar.google.com',
      }) as Record<string, unknown>;
      expect(result.calendarId).toBe('my-calendar@group.calendar.google.com');
    });

    it('should reject missing required properties', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ timeMin: '2025-01-01T00:00:00Z' })).toThrow();
      expect(() => schema.parse({ timeMax: '2025-01-07T23:59:59Z' })).toThrow();
      expect(() => schema.parse({})).toThrow();
    });

    it('should reject extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() =>
        schema.parse({
          timeMin: '2025-01-01T00:00:00Z',
          timeMax: '2025-01-07T23:59:59Z',
          extra: 'not-allowed',
        }),
      ).toThrow();
    });
  });

  describe('execution', () => {
    const ctx = { userId: 'user-1' } as RunContext;
    const args = {
      timeMin: '2025-01-01T00:00:00Z',
      timeMax: '2025-01-07T23:59:59Z',
      calendarId: 'primary',
    };

    it('should return unauthorized error when no valid token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await tool.execute(args, ctx);

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('user-1', 'google');
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid Google token found. Please authenticate first.',
      });
    });

    it('should fetch events successfully with valid token', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue('valid-token');

      const mockEvents = {
        items: [
          {
            id: 'event-1',
            summary: 'Team Meeting',
            start: { dateTime: '2025-01-02T10:00:00Z' },
            end: { dateTime: '2025-01-02T11:00:00Z' },
          },
          {
            id: 'event-2',
            summary: 'All-day Event',
            start: { date: '2025-01-03' },
            end: { date: '2025-01-04' },
          },
        ],
      };

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockEvents),
      } as Response);

      const result = await tool.execute(args, ctx);

      expect(result.data).toEqual({
        events: [
          { id: 'event-1', summary: 'Team Meeting', start: '2025-01-02T10:00:00Z', end: '2025-01-02T11:00:00Z' },
          { id: 'event-2', summary: 'All-day Event', start: '2025-01-03', end: '2025-01-04' },
        ],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/calendar/v3/calendars/primary/events'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid-token' },
        }),
      );
    });

    it('should return 401 error when API returns unauthorized', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue('expired-token');

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await tool.execute(args, ctx);

      expect(result.data).toEqual({
        error: '401',
        message: 'Google token was rejected. Please re-authenticate.',
      });
    });

    it('should return 401 error when API returns 403', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue('valid-token');

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const result = await tool.execute(args, ctx);

      expect(result.data).toEqual({
        error: '401',
        message: 'Google token was rejected. Please re-authenticate.',
      });
    });

    it('should return api_error for other HTTP errors', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue('valid-token');

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error body'),
      } as Response);

      const result = await tool.execute(args, ctx);

      expect(result.data).toEqual({
        error: 'api_error',
        message: 'Google Calendar API error: Internal Server Error',
      });
    });

    it('should encode calendarId in the URL', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue('valid-token');

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] }),
      } as Response);

      await tool.execute({ ...args, calendarId: 'user@example.com' }, ctx);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('calendars/user%40example.com/events'),
        expect.anything(),
      );
    });

    it('should pass query parameters correctly', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue('valid-token');

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] }),
      } as Response);

      await tool.execute(args, ctx);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      const url = new URL(fetchUrl);
      expect(url.searchParams.get('timeMin')).toBe('2025-01-01T00:00:00Z');
      expect(url.searchParams.get('timeMax')).toBe('2025-01-07T23:59:59Z');
      expect(url.searchParams.get('singleEvents')).toBe('true');
      expect(url.searchParams.get('orderBy')).toBe('startTime');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
  });
});
