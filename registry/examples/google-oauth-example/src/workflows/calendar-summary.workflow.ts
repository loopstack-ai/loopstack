import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  DOCUMENT_STORE,
  Final,
  Guard,
  Initial,
  LinkDocument,
  MarkdownDocument,
  TEMPLATE_RENDERER,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, TemplateRenderFn, WorkflowContext } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { GoogleCalendarFetchEventsTool } from '../tools';

interface CalendarSummaryState {
  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
  requiresAuthentication?: boolean;
}

@Workflow({
  uiConfig: __dirname + '/calendar-summary.ui.yaml',
  schema: z
    .object({
      calendarId: z.string().default('primary'),
    })
    .strict(),
})
export class CalendarSummaryWorkflow extends BaseWorkflow<{ calendarId: string }, CalendarSummaryState> {
  constructor(
    private readonly googleCalendarFetchEvents: GoogleCalendarFetchEventsTool,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  // --- Fetch events from Google Calendar ---

  @Initial({ to: 'calendar_fetched' })
  async fetchEvents(
    ctx: WorkflowContext,
    args: { calendarId: string },
    state: CalendarSummaryState,
  ): Promise<CalendarSummaryState> {
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
  async authRequired(ctx: WorkflowContext, state: CalendarSummaryState): Promise<CalendarSummaryState> {
    const result = await this.orchestrator.queue(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { workflowName: OAuthWorkflow.name, callback: { transition: 'authCompleted' } },
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
  async authCompleted(
    ctx: WorkflowContext,
    state: CalendarSummaryState,
    payload: { workflowId: string },
  ): Promise<CalendarSummaryState> {
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
  @Final({ from: 'calendar_fetched' })
  async displayResults(ctx: WorkflowContext, state: CalendarSummaryState): Promise<unknown> {
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
