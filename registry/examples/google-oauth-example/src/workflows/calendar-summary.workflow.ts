import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Final,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import { LinkDocument, MarkdownDocument } from '@loopstack/core';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { GoogleCalendarFetchEventsTool } from '../tools';

interface CalendarFetchResult {
  error?: string;
  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
}

@Workflow({
  uiConfig: __dirname + '/calendar-summary.workflow.yaml',
  schema: z
    .object({
      calendarId: z.string().default('primary'),
    })
    .strict(),
})
export class CalendarSummaryWorkflow extends BaseWorkflow {
  // Custom tool (demonstrates building an OAuth-aware tool from scratch)
  @InjectTool() private googleCalendarFetchEvents: GoogleCalendarFetchEventsTool;

  @InjectWorkflow() private oAuth: OAuthWorkflow;

  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
  requiresAuthentication?: boolean;
  // --- Fetch events from Google Calendar ---

  @Initial({ to: 'calendar_fetched' })
  async fetchEvents(args: { calendarId: string }) {
    const result: ToolResult<CalendarFetchResult> = await this.googleCalendarFetchEvents.call({
      calendarId: args.calendarId,
      timeMin: this.now(),
      timeMax: this.endOfWeek(),
    });
    this.requiresAuthentication = result.data!.error === 'unauthorized';
    this.events = result.data!.events;
  }

  // If unauthorized -> launch OAuth as sub-workflow
  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired() {
    const result = await this.oAuth.run(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { alias: 'oAuth', callback: { transition: 'authCompleted' } },
    );

    await this.repository.save(
      LinkDocument,
      {
        label: 'Google authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
  }

  needsAuth(): boolean {
    return !!this.requiresAuthentication;
  }

  // Auth sub-workflow completed -> retry from start
  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
    schema: CallbackSchema,
  })
  async authCompleted(payload: { workflowId: string }) {
    await this.repository.save(
      LinkDocument,
      {
        status: 'success',
        label: 'Google authentication completed',
        workflowId: payload.workflowId,
        embed: true,
        expanded: false,
      },
      { id: `link_${payload.workflowId}` },
    );
  }

  // Success -> display summary
  @Final({ from: 'calendar_fetched' })
  async displayResults() {
    await this.repository.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/calendarSummary.md', { events: this.events }),
    });
  }

  private now(): string {
    return new Date().toISOString();
  }

  private endOfWeek(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek.toISOString();
  }
}
