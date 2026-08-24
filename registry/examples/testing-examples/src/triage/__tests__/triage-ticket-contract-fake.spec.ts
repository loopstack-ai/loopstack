import { describe, expect, it } from 'vitest';
import { createContractFake, runWorkflow } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';
import { TriageTicketWorkflow } from '../triage-ticket.workflow';

/**
 * Contract fake: a DI-level tool replacement whose scripted response is validated against
 * the tool's declared `resultSchema` at scripting time. Use it when you want to control a
 * tool's output *and* assert how the workflow called it (`fake.call` is a vitest mock) —
 * the contract-honest alternative to a free-form mock and the lighter-weight cousin of a
 * recorded fixture. A scripted envelope that drifts from the tool's real result shape fails
 * the test instead of passing against a stale mock.
 */
describe('TriageTicketWorkflow — contract fake', () => {
  it('drives the workflow with a scripted classification and asserts the call', async () => {
    const classify = createContractFake(ClassifyTicketTool);
    classify.returns({ data: { severity: 'high', reason: 'scripted by the contract fake' } });

    const run = await runWorkflow(
      TriageTicketWorkflow,
      { text: 'Production is down!' },
      {
        // Substitute the tool with the fake. (For a tool that comes from an imported module,
        // reach it with `overrides: [[Tool, fake]]` instead.)
        providers: [{ provide: ClassifyTicketTool, useValue: classify }],
        answers: { approve: { answer: 'yes' } },
      },
    );

    expect(run.status).toBe('completed');
    expect(run.result).toMatchObject({ severity: 'high', approved: true });
    // The workflow passed the ticket text straight through to the tool.
    expect(classify.call).toHaveBeenCalledWith({ text: 'Production is down!' });
    expect(run.document('approval_prompt')).toMatchObject({
      question: expect.stringContaining('scripted by the contract fake'),
    });
  });
});
