import { describe, expect, it, vi } from 'vitest';
import { GoogleCalendarFetchEventsTool } from '@loopstack/google-workspace';
import { OAuthWorkflow } from '@loopstack/oauth';
import { runWorkflow } from '@loopstack/testing';
import { GoogleCalendarSummaryExampleWorkflow } from '../google-calendar-summary-example.workflow';

/**
 * The calendar tool and the OAuth sub-workflow are fakes. The retry after sign-in and the
 * `auth_failed` branch are tested in the GitHub overview example, which teaches that flow.
 */
function setup(fetchEvents: ReturnType<typeof vi.fn>) {
  const fetchEventsTool = { call: fetchEvents };
  const oAuthWorkflow = { run: vi.fn().mockResolvedValue(undefined) };
  const providers = [
    { provide: GoogleCalendarFetchEventsTool, useValue: fetchEventsTool },
    { provide: OAuthWorkflow, useValue: oAuthWorkflow },
  ];
  return { fetchEventsTool, oAuthWorkflow, providers };
}

describe('GoogleCalendarSummaryExampleWorkflow', () => {
  it('renders a summary of the fetched events', async () => {
    const { fetchEventsTool, oAuthWorkflow, providers } = setup(
      vi.fn().mockResolvedValue({
        data: {
          events: [
            { id: '1', summary: 'Standup', start: '2026-10-12T09:00:00Z', end: '2026-10-12T09:15:00Z' },
            { id: '2', start: '2026-10-13', end: '2026-10-14' },
          ],
        },
      }),
    );

    const run = await runWorkflow(GoogleCalendarSummaryExampleWorkflow, { calendarId: 'team' }, { providers });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.place).toBe('end');
    expect(fetchEventsTool.call).toHaveBeenCalledWith(expect.objectContaining({ calendarId: 'team' }));
    expect(oAuthWorkflow.run).not.toHaveBeenCalled();
    const markdown = run.documents.map((d) => (d.content as { markdown?: string }).markdown ?? '').join('\n');
    expect(markdown).toContain('**Standup** — 2026-10-12T09:00:00Z to 2026-10-12T09:15:00Z');
    expect(markdown).toContain('**(no title)** — 2026-10-13 to 2026-10-14');
  });

  it('starts the OAuth sub-workflow when the calendar tool asks to authenticate', async () => {
    const { oAuthWorkflow, providers } = setup(
      vi.fn().mockRejectedValue(new Error('No valid Google token found. Please authenticate first.')),
    );

    const run = await runWorkflow(GoogleCalendarSummaryExampleWorkflow, undefined, { providers });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_auth');
    expect(oAuthWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
      expect.objectContaining({ callback: { transition: 'authCompleted' } }),
    );
  });
});
