import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';

export type GoogleCalendarListCalendarsArgs = {
  showHidden?: boolean;
};

@Tool({
  config: {
    description:
      'Lists all calendars the authenticated user has access to. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class GoogleCalendarListCalendarsTool implements ToolInterface {
  private readonly logger = new Logger(GoogleCalendarListCalendarsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        showHidden: z.boolean().optional(),
      })
      .strict(),
  })
  args: GoogleCalendarListCalendarsArgs;

  async execute(args: GoogleCalendarListCalendarsArgs, ctx: RunContext): Promise<ToolResult> {
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
