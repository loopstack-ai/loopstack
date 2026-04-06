import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    calendarId: z.string().default('primary'),
    summary: z.string(),
    description: z.string().optional(),
    start: z.string(),
    end: z.string(),
    location: z.string().optional(),
    attendees: z.array(z.object({ email: z.string() })).optional(),
    reminders: z
      .object({
        useDefault: z.boolean(),
        overrides: z.array(z.object({ method: z.string(), minutes: z.number() })).optional(),
      })
      .optional(),
  })
  .strict();

export type GoogleCalendarCreateEventArgs = z.infer<typeof inputSchema>;

@Tool({
  uiConfig: {
    description:
      'Creates a new event on Google Calendar. Returns { error: "unauthorized" } if no valid token is available.',
  },
  schema: inputSchema,
})
export class GoogleCalendarCreateEventTool extends BaseTool {
  private readonly logger = new Logger(GoogleCalendarCreateEventTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  async call(args: GoogleCalendarCreateEventArgs): Promise<ToolResult> {
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

    const eventBody: Record<string, unknown> = {
      summary: args.summary,
      start: { dateTime: args.start },
      end: { dateTime: args.end },
    };

    if (args.description) eventBody.description = args.description;
    if (args.location) eventBody.location = args.location;
    if (args.attendees) eventBody.attendees = args.attendees;
    if (args.reminders) eventBody.reminders = args.reminders;

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Google Calendar API returned ${response.status} for user ${this.ctx.context.userId}`);
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

    const event = (await response.json()) as {
      id: string;
      summary: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      htmlLink: string;
    };

    return {
      data: {
        event: {
          id: event.id,
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          htmlLink: event.htmlLink,
        },
      },
    };
  }
}
