import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  Guard,
  LinkDocument,
  MarkdownDocument,
  TEMPLATE_RENDERER,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, LoopstackContext, TemplateRenderFn } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { GoogleCalendarFetchEventsTool } from '../tools';

interface CalendarSummaryState {
  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
  requiresAuthentication?: boolean;
}

@Workflow({
  title: 'Google Calendar Summary',
  description:
    'Fetches upcoming events from Google Calendar and displays a summary.\nIf not authenticated, launches the OAuth workflow as a sub-workflow\nand retries automatically after authentication completes.',
  name: 'google_calendar_summary',
  schema: z
    .object({
      calendarId: z.string().default('primary'),
    })
    .strict(),
})
export class CalendarSummaryWorkflow extends BaseWorkflow<{ calendarId: string }, CalendarSummaryState> {
  constructor(
    private readonly googleCalendarFetchEvents: GoogleCalendarFetchEventsTool,
    private readonly oAuthWorkflow: OAuthWorkflow,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  // --- Fetch events from Google Calendar ---

  @Transition({ to: 'calendar_fetched' })
  async fetchEvents(state: CalendarSummaryState, ctx: LoopstackContext): Promise<CalendarSummaryState> {
    const args = ctx.args as { calendarId: string };
    const result = await this.googleCalendarFetchEvents.call({
      calendarId: args.calendarId,
      timeMin: this.now(),
      timeMax: this.endOfWeek(),
    });
    return {
      ...state,
      requiresAuthentication: result.data!.error === 'unauthorized',
      events: result.data!.events,
    };
  }

  // If unauthorized -> launch OAuth as sub-workflow
  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired(state: CalendarSummaryState): Promise<CalendarSummaryState> {
    const result = await this.oAuthWorkflow.run(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { callback: { transition: 'authCompleted' } },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        label: 'Google authentication required',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );
    return state;
  }

  needsAuth(state: CalendarSummaryState): boolean {
    return !!state.requiresAuthentication;
  }

  // Auth sub-workflow completed -> retry from start
  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
    schema: CallbackSchema,
  })
  async authCompleted(state: CalendarSummaryState, payload: { workflowId: string }): Promise<CalendarSummaryState> {
    await this.documentStore.save(
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
    return state;
  }

  // Success -> display summary
  @Transition({ from: 'calendar_fetched', to: 'end' })
  async displayResults(state: CalendarSummaryState): Promise<unknown> {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/calendarSummary.md', { events: state.events }),
    });
    return {};
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
