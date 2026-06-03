import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

const inputSchema = z
  .object({
    showHidden: z.boolean().optional(),
  })
  .strict();

export type GoogleCalendarListCalendarsArgs = z.infer<typeof inputSchema>;

export type GoogleCalendarListCalendarsResult =
  | {
      calendars: Array<{
        id: string;
        summary: string;
        description?: string;
        primary: boolean;
        timeZone?: string;
      }>;
    }
  | { error: 'unauthorized'; message: string }
  | { error: 'api_error'; message: string };

@Tool({
  name: 'google_calendar_list_calendars',
  description:
    'Lists all calendars the authenticated user has access to. Returns { error: "unauthorized" } if no valid token is available.',
  schema: inputSchema,
})
export class GoogleCalendarListCalendarsTool extends BaseTool<
  GoogleCalendarListCalendarsArgs,
  object,
  GoogleCalendarListCalendarsResult
> {
  private readonly logger = new Logger(GoogleCalendarListCalendarsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  protected async handle(
    args: GoogleCalendarListCalendarsArgs,
    ctx: LoopstackContext,
  ): Promise<ToolResult<GoogleCalendarListCalendarsResult>> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'google');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Google token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams();
    if (args.showHidden) {
      params.set('showHidden', 'true');
    }

    const url = `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Google Calendar API returned ${response.status} for user ${ctx.userId}`);
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
        summary: string;
        description?: string;
        primary?: boolean;
        timeZone?: string;
      }>;
    };

    const calendars = data.items.map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary ?? false,
      timeZone: cal.timeZone,
    }));

    return {
      data: { calendars },
    };
  }
}
