import { describe, expect, it, vi } from 'vitest';
import { OAuthWorkflow } from '@loopstack/oauth-module';
import { failure, queue, runWorkflow } from '@loopstack/testing';
import { GoogleCalendarFetchEventsTool } from '../../../shared/google';
import { GoogleCalendarSummaryExampleWorkflow } from '../google-calendar-summary-example.workflow';

/**
 * The OAuth sub-workflow is a stub and the calendar tool rejects with the real "authenticate"
 * message, so the run always takes the auth branch; scripted `authCompleted` answers stand in
 * for the sub-workflow's callback.
 */
function setup() {
  const fetchEventsTool = {
    call: vi.fn().mockRejectedValue(new Error('No valid Google token found. Please authenticate first.')),
  };
  const oAuthWorkflow = { run: vi.fn().mockResolvedValue(undefined) };
  const providers = [
    { provide: GoogleCalendarFetchEventsTool, useValue: fetchEventsTool },
    { provide: OAuthWorkflow, useValue: oAuthWorkflow },
  ];
  return { fetchEventsTool, oAuthWorkflow, providers };
}

describe('GoogleCalendarSummaryExampleWorkflow', () => {
  it('catches an unauthorized error and routes into the OAuth branch', async () => {
    const { fetchEventsTool, oAuthWorkflow, providers } = setup();

    const run = await runWorkflow(GoogleCalendarSummaryExampleWorkflow, undefined, { providers });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_auth');
    expect(fetchEventsTool.call).toHaveBeenCalledTimes(1);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });

  it('retries from start after a successful sign-in', async () => {
    const { fetchEventsTool, oAuthWorkflow, providers } = setup();

    const run = await runWorkflow(GoogleCalendarSummaryExampleWorkflow, undefined, {
      providers,
      answers: { authCompleted: queue({ authenticated: true }) },
    });

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_auth');
    expect(fetchEventsTool.call).toHaveBeenCalledTimes(2);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(2);
  });

  it('fails at auth_failed when the OAuth sub-workflow fails', async () => {
    const { oAuthWorkflow, providers } = setup();

    const run = await runWorkflow(GoogleCalendarSummaryExampleWorkflow, undefined, {
      providers,
      answers: { authCompleted: queue(failure('GOOGLE_CLIENT_ID is not configured')) },
    });

    expect(run.status).toBe('failed');
    expect(run.place).toBe('auth_failed');
    expect(run.error).toBe('GOOGLE_CLIENT_ID is not configured');
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['retryAuth']);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });
});
