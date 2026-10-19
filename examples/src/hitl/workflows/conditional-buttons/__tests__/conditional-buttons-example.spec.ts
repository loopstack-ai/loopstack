import { describe, expect, it } from 'vitest';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { ConditionalButtonsExampleWorkflow } from '../conditional-buttons-example.workflow';

describe('ConditionalButtonsExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const run = async (answers?: Record<string, unknown>) => {
    const result = await runWorkflow(ConditionalButtonsExampleWorkflow, undefined, answers ? { answers } : {});
    runs.push(result);
    return result;
  };

  // parkView() returns the prompt the user would answer now — the first *active* widget. A
  // disabled widget (enabledWhen) and a hidden one (showWhen) are both skipped, so these
  // assertions show which button is answerable at each place. How each looks in Studio
  // (greyed out vs. not rendered) is the widgetState rule, tested in @loopstack/contracts.
  it('offers "Submit draft" at drafting, while "Approve" is hidden', async () => {
    const result = await run();

    expect(result.status).toBe('waiting');
    expect(result.place).toBe('drafting');
    expect(result.parkView()).toMatchObject({
      widget: 'button',
      options: { transition: 'submitDraft', label: 'Submit draft' },
      defaultTransition: 'submitDraft',
    });
  });

  it('offers "Approve" at in_review, while "Submit draft" is disabled', async () => {
    const result = await run({ submitDraft: {} });

    expect(result.status).toBe('waiting');
    expect(result.place).toBe('in_review');
    expect(result.parkView()).toMatchObject({
      widget: 'button',
      options: { transition: 'approve', label: 'Approve' },
      defaultTransition: 'approve',
    });
  });

  it('completes after both buttons are clicked', async () => {
    const result = await run({ submitDraft: {}, approve: {} });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.path).toEqual(['startDraft', 'submitDraft', 'approve']);
    expect(result.result).toEqual({ approved: true });
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, ConditionalButtonsExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
