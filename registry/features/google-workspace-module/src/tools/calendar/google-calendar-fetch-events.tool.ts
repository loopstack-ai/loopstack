import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GoogleCalendarFetchEventsArgs = {
  calendarId?: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  query?: string;
};

@Tool({
  config: {
    description:
      'Fetches events from a Google Calendar within a time range. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GoogleCalendarFetchEventsTool extends BaseTool {
  private readonly logger = new Logger(GoogleCalendarFetchEventsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        calendarId: z.string().default('primary'),
        timeMin: z.string(),
        timeMax: z.string(),
        maxResults: z.number().optional(),
        query: z.string().optional(),
      })
      .strict(),
  })
  args: GoogleCalendarFetchEventsArgs;

  async run(args: GoogleCalendarFetchEventsArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.context.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const calendarId = args.calendarId || 'primary';
    const params = new URLSearchParams({
      timeMin: args.timeMin,
      timeMax: args.timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (args.maxResults) {
      params.set('maxResults', String(args.maxResults));
    }
    if (args.query) {
      params.set('q', args.query);
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Google Calendar API returned ${response.status} for user ${this.context.userId}`);
      return {
        data: {
          error: 'unauthorized',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Google Calendar API error: ${response.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Google Calendar API error: ${response.statusText}`,
        },
      };
    }

    const data = (await response.json()) as {
      items: Array<{
        id: string;
        summary?: string;
        description?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
        location?: string;
        attendees?: Array<{ email: string; responseStatus?: string }>;
        htmlLink?: string;
      }>;
    };

    const events = data.items.map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location,
      attendees: event.attendees?.map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
      htmlLink: event.htmlLink,
    }));

    return {
      data: { events },
    };
  }
}
