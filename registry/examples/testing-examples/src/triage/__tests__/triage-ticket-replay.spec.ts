import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { replay, runWorkflow } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';
import { TriageTicketWorkflow } from '../triage-ticket.workflow';

/**
 * Replay: recorded tool responses are returned instead of executing the tool — the workflow's
 * own code still runs for real. Fixtures come from a live run via
 * `loopstack runs <run-id> --record <file>` (run started with `loopstack run --trace`)
 * and are committed next to the test.
 */
describe('TriageTicketWorkflow — replay', () => {
  it('replays the recorded classification instead of executing the tool', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'Production is down!' },
      {
        providers: [ClassifyTicketTool],
        answers: { approve: { approved: true } },
        replay: replay(join(__dirname, '__recordings__/triage.json')),
      },
    );

    expect(run.status).toBe('completed');
    // The reason can only come from the fixture — proof the live tool never ran
    expect(run.result).toMatchObject({ severity: 'high', approved: true });
    expect(run.document('triage_report')).toMatchObject({
      text: 'Ticket severity: high (replayed from recording)',
    });
  });

  it('accepts an inline fixture object', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'anything at all' },
      {
        providers: [ClassifyTicketTool],
        answers: { approve: { approved: true } },
        replay: replay({
          version: 2,
          recordings: [
            {
              tool: 'classify_ticket',
              envelope: { data: { severity: 'normal', reason: 'inline fixture' } },
            },
          ],
        }),
      },
    );

    expect(run.result).toMatchObject({ severity: 'normal' });
  });
});
