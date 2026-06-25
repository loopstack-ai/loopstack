import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Guard, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { GoogleCalendarFetchEventsTool } from '../../shared/google';

interface CalendarSummaryState {
  events?: Array<{ id: string; summary: string; start?: string; end?: string }>;
  requiresAuthentication?: boolean;
}

const CalendarSummaryArgsSchema = z
  .object({
    calendarId: z.string().default('primary'),
  })
  .strict();

type CalendarSummaryArgs = z.infer<typeof CalendarSummaryArgsSchema>;

@Workflow({
  title: 'OAuth - Google Calendar Summary Example',
  description:
    'Fetches upcoming Google Calendar events and displays a summary. Launches the OAuth workflow as a sub-workflow on unauthorized errors and retries automatically.',
  name: 'google_calendar_summary_example',
  schema: CalendarSummaryArgsSchema,
})
export class GoogleCalendarSummaryExampleWorkflow extends BaseWorkflow<CalendarSummaryArgs> {
  constructor(
    private readonly googleCalendarFetchEvents: GoogleCalendarFetchEventsTool,
    private readonly oAuthWorkflow: OAuthWorkflow,
  ) {
    super();
  }

  // --- Fetch events from Google Calendar ---

  @Transition({ to: 'calendar_fetched' })
  async fetchEvents(state: CalendarSummaryState, ctx: RunContext<CalendarSummaryArgs>) {
    try {
      const result = await this.googleCalendarFetchEvents.call({
        calendarId: ctx.args.calendarId,
        timeMin: this.now(),
        timeMax: this.endOfWeek(),
      });
      this.assignState({ requiresAuthentication: false, events: result.data.events });
    } catch (error) {
      // The Google tools throw with their human-readable message on auth failure
      // ("No valid Google token found. Please authenticate first." / "Google token was rejected. Please re-authenticate.").
      // Both contain "authenticate" — match on that to route through the OAuth sub-workflow.
      if (error instanceof Error && /authenticate/i.test(error.message)) {
        this.assignState({ requiresAuthentication: true });
        return;
      }
      throw error;
    }
  }

  // If unauthorized -> launch OAuth as sub-workflow
  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired(_state: CalendarSummaryState) {
    await this.oAuthWorkflow.run(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { callback: { transition: 'authCompleted' }, show: 'inline', label: 'Google authentication required' },
    );
  }

  needsAuth(state: CalendarSummaryState): boolean {
    return !!state.requiresAuthentication;
  }

  // Auth sub-workflow completed -> retry from start
  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
  })
  authCompleted(_state: CalendarSummaryState, _input: TransitionInput) {}

  // Success -> display summary
  @Transition({ from: 'calendar_fetched', to: 'end' })
  async displayResults(state: CalendarSummaryState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(join(__dirname, 'templates', 'calendarSummary.md'), { events: state.events }),
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
