import { describe, expect, it } from 'vitest';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { TestingExamplesModule } from '../../testing-examples.module';
import { ClassifyTicketTool } from '../classify-ticket.tool';
import { TriageTicketWorkflow } from '../triage-ticket.workflow';

/**
 * Workflow tests: the real state machine runs in-process — no backend, no database.
 * Each scenario is named for the acceptance criterion it checks (`C1:`…), so the test
 * report reads as a criteria matrix (see the Testing Methodology guide). Assert on
 * outcomes — status, path, result, documents, and what the user sees at a park — never
 * on internal mechanics.
 *
 * Acceptance criteria:
 *   C1 — a high-severity ticket is classified, reported, and (on approval) completes as approved.
 *   C2 — while awaiting approval the run parks showing a yes/no prompt with the severity.
 *   C3 — a rejected classification completes as not approved.
 */
describe('TriageTicketWorkflow', () => {
  const runs: TestRun[] = [];
  const run = async (text: string, answer?: 'yes' | 'no') => {
    const result = await runWorkflow(
      TriageTicketWorkflow,
      { text },
      {
        // Import the app module so the document's widget config is discoverable —
        // parkView() resolves the same widget the CLI and Studio render.
        imports: [TestingExamplesModule],
        providers: [ClassifyTicketTool],
        ...(answer ? { answers: { approve: { answer } } } : {}),
      },
    );
    runs.push(result);
    return result;
  };

  it('C1: classifies an outage as high severity and completes when approved', async () => {
    const result = await run('Production is down!', 'yes');

    expect(result.status).toBe('completed');
    expect(result.path).toEqual(['classify', 'report', 'approve']);
    expect(result.result).toMatchObject({ severity: 'high', approved: true });
    expect(result.document('approval_prompt')).toMatchObject({
      severity: 'high',
      question: 'Ticket severity: high (matched urgency keyword "down"). Approve this classification?',
    });
  });

  it('C2: parks for approval showing the severity prompt', async () => {
    const result = await run('Where is my invoice?');

    expect(result.status).toBe('waiting');
    expect(result.place).toBe('awaiting_approval');
    expect(result.path).toEqual(['classify', 'report']);

    // What the human would see at this park — resolved by the same rules the CLI and Studio use.
    const view = result.parkView();
    expect(view).toMatchObject({
      widget: 'confirm-prompt',
      documentName: 'approval_prompt',
      content: { severity: 'normal', question: expect.stringContaining('normal') },
      transitions: ['approve'],
      defaultTransition: 'approve',
    });
  });

  it('C3: records a rejected classification', async () => {
    const result = await run('Urgent: cannot log in', 'no');

    expect(result.status).toBe('completed');
    expect(result.result).toMatchObject({ severity: 'high', approved: false });
  });

  it('covers every declared transition and park (coverage gate)', () => {
    const cov = coverage(runs, TriageTicketWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
    expect(cov.complete).toBe(true);
  });
});
