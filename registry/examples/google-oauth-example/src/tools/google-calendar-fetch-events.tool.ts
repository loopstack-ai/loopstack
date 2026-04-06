import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const GoogleCalendarFetchEventsSchema = z
  .object({
    timeMin: z.string(),
    timeMax: z.string(),
    calendarId: z.string().default('primary'),
  })
  .strict();

type GoogleCalendarFetchEventsArgs = z.infer<typeof GoogleCalendarFetchEventsSchema>;

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
}

@Tool({
  uiConfig: {
    description:
      'Fetches events from Google Calendar. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: GoogleCalendarFetchEventsSchema,
})
export class GoogleCalendarFetchEventsTool extends BaseTool {
  private readonly logger = new Logger(GoogleCalendarFetchEventsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GoogleCalendarFetchEventsArgs): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(this.ctx.context.userId, 'google');

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

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Google Calendar API returned ${response.status} for user ${this.ctx.context.userId}`);
      return {
        data: {
          error: '401',
          message: 'Google token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Google Calendar API error: ${response.status} ${body}`);
      console.log('api_error', response.statusText);
      return {
        data: {
          error: 'api_error',
          message: `Google Calendar API error: ${response.statusText}`,
        },
      };
    }

    const data: GoogleCalendarListResponse = (await response.json()) as GoogleCalendarListResponse;
    const events = data.items.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    return {
      data: { events },
    };
  }
}
