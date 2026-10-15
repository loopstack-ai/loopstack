import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, Guard, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { GoogleCalendarFetchEventsTool } from '@loopstack/google-workspace';
import { OAuthWorkflow } from '@loopstack/oauth';

interface CalendarSummaryState {
  events?: Array<{ id: string; summary?: string; start?: string; end?: string }>;
  requiresAuthentication?: boolean;
}

const CalendarSummaryArgsSchema = z
  .object({
    calendarId: z.string().default('primary'),
  })
  .strict();

type CalendarSummaryArgs = z.infer<typeof CalendarSummaryArgsSchema>;

@Workflow({
  title: 'Google Workspace - Calendar Summary Example',
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
      if (error instanceof Error && /authenticate/i.test(error.message)) {
        this.assignState({ requiresAuthentication: true });
        return;
      }
      throw error;
    }
  }

  // --- Sign in to Google and retry ---
  // The same sign-in-and-retry flow as the GitHub overview example (examples/src/github), which explains it.

  @Transition({ from: 'calendar_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired() {
    await this.oAuthWorkflow.run(
      { provider: 'google', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
      { onSuccess: { transition: 'authCompleted' }, show: 'inline', label: 'Google authentication required' },
    );
  }

  needsAuth(state: CalendarSummaryState): boolean {
    return !!state.requiresAuthentication;
  }

  @Transition({
    from: 'awaiting_auth',
    to: 'start',
    wait: true,
    errorPlace: 'auth_failed',
  })
  authCompleted(_state: CalendarSummaryState, _input: TransitionInput) {}

  @Transition({ from: 'auth_failed', to: 'start', wait: true })
  retryAuth() {}

  // --- Display the summary ---

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
