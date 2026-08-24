import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { replay, runWorkflow } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';
import { TriageTicketWorkflow } from '../triage-ticket.workflow';

/**
 * Record/replay: recorded tool responses are returned instead of executing the tool — the
 * workflow's own code still runs for real. Replaying makes non-deterministic tools (above
 * all LLM calls) deterministic; here the classifier is deterministic already, so the point
 * is the mechanism itself.
 *
 * The `fixture:` option is the default path — it replays when the file exists and records a
 * fresh fixture when it is missing (in CI a missing fixture is an error, so a forgotten
 * `git add` can never silently downgrade the test into a live run). Record a fixture from a
 * real run:
 *
 *   loopstack run triage_ticket --arg text="Production is down!" --trace
 *   loopstack runs <run-id> --record src/triage/__tests__/__recordings__/triage.json
 */
describe('TriageTicketWorkflow — record/replay', () => {
  it('replays the committed fixture instead of executing the tool', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'Production is down!' },
      {
        providers: [ClassifyTicketTool],
        answers: { approve: { answer: 'yes' } },
        fixture: join(__dirname, '__recordings__/triage.json'),
      },
    );

    expect(run.status).toBe('completed');
    // The reason text can only come from the fixture — proof the live tool never ran.
    expect(run.result).toMatchObject({ severity: 'high', approved: true });
    expect(run.document('approval_prompt')).toMatchObject({
      question: expect.stringContaining('replayed from recording'),
    });
  });

  it('accepts an inline fixture for fully-scripted determinism', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'anything at all' },
      {
        providers: [ClassifyTicketTool],
        answers: { approve: { answer: 'yes' } },
        replay: replay({
          version: 3,
          recordings: [
            {
              tool: 'classify_ticket',
              envelope: { data: { severity: 'normal', reason: 'inline fixture' } },
            },
          ],
        }),
      },
    );

    expect(run.result).toMatchObject({ severity: 'normal', approved: true });
  });
});
