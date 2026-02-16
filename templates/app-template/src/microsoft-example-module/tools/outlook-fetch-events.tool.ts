import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowInterface,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import { OAuthTokenStore } from '../../oauth-module';

export type OutlookFetchEventsArgs = {
  timeMin: string;
  timeMax: string;
};

interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

interface GraphCalendarResponse {
  value: GraphCalendarEvent[];
}

@Tool({
  config: {
    description:
      'Fetches upcoming events from Outlook Calendar via Microsoft Graph. Returns { error: "unauthorized" } if no valid token is available.',
  },
})
export class OutlookFetchEventsTool implements ToolInterface {
  private readonly logger = new Logger(OutlookFetchEventsTool.name);

  @Inject()
  private tokenStore: OAuthTokenStore;

  @Input({
    schema: z
      .object({
        timeMin: z.string(),
        timeMax: z.string(),
      })
      .strict(),
  })
  args: OutlookFetchEventsArgs;

  async execute(
    args: OutlookFetchEventsArgs,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'microsoft');

    if (!accessToken) {
      return {
        data: {
          error: 'unauthorized',
          message: 'No valid Microsoft token found. Please authenticate first.',
        },
      };
    }

    const params = new URLSearchParams({
      startDateTime: args.timeMin,
      endDateTime: args.timeMax,
      $orderby: 'start/dateTime',
      $top: '25',
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Microsoft Graph returned ${response.status} for user ${ctx.userId}`);
      return {
        data: {
          error: 'unauthorized',
          message: 'Microsoft token was rejected. Please re-authenticate.',
        },
      };
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Microsoft Graph error: ${response.status} ${body}`);
      return {
        data: {
          error: 'api_error',
          message: `Microsoft Graph API error: ${response.statusText}`,
        },
      };
    }

    const data: GraphCalendarResponse = (await response.json()) as GraphCalendarResponse;

    const events = data.value.map((event) => ({
      id: event.id,
      summary: event.subject,
      start: event.start.dateTime,
      end: event.end.dateTime,
    }));

    return {
      data: { events },
    };
  }
}
