import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';
import { TriageTicketWorkflow } from '../triage-ticket.workflow';

/**
 * Workflow tests: the real state machine runs in-process — no backend, no database.
 * Assert on status, transition path, result, and documents; script HITL answers.
 */
describe('TriageTicketWorkflow', () => {
  it('triages a ticket and completes after approval', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'Production is down!' },
      {
        providers: [ClassifyTicketTool],
        answers: { approve: { approved: true } }, // scripted HITL answer for the wait transition
      },
    );

    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['classify', 'report', 'approve']);
    expect(run.result).toMatchObject({ severity: 'high', approved: true });
    expect(run.document('triage_report')).toMatchObject({
      role: 'assistant',
      text: 'Ticket severity: high (matched urgency keyword "down")',
    });
  });

  it('parks at the approval step when no answer is scripted', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'Where is my invoice?' },
      {
        providers: [ClassifyTicketTool],
      },
    );

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_approval');
    expect(run.path).toEqual(['classify', 'report']);
    expect(run.document('triage_report')).toMatchObject({ text: expect.stringContaining('normal') });
  });

  it('records a rejection', async () => {
    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'Urgent: cannot log in' },
      {
        providers: [ClassifyTicketTool],
        answers: { approve: { approved: false } },
      },
    );

    expect(run.status).toBe('completed');
    expect(run.result).toMatchObject({ severity: 'high', approved: false });
  });
});
