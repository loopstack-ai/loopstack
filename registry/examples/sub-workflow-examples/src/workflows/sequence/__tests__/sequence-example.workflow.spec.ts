import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { RunSubWorkflowExampleSubWorkflow } from '../../run/child.workflow';
import { RunSubWorkflowExampleSequenceWorkflow } from '../sequence-example.workflow';

/**
 * The concept under test: `SequenceWorkflow` runs the items one after another and resumes the
 * parent once at the end — so the aggregated results come back in the declared order.
 *
 * Acceptance criteria:
 *   C1 — three steps produce one aggregated callback whose results keep the declared order.
 */
describe('RunSubWorkflowExampleSequenceWorkflow', () => {
  it('C1: resumes once with the child results in sequence order', async () => {
    const run = await runWorkflow(RunSubWorkflowExampleSequenceWorkflow, undefined, {
      providers: [RunSubWorkflowExampleSubWorkflow],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['launch', 'onComplete']);
    expect(run.result).toMatchObject({ hasErrors: false, errorCount: 0 });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toEqual(['Sequence step-1: Hi mom!', 'Sequence step-2: Hi mom!', 'Sequence step-3: Hi mom!']);

    const cov = coverage([run], RunSubWorkflowExampleSequenceWorkflow);
    expect(cov.missingTransitions).toEqual([]);
  });
});
