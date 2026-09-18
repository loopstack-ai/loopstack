import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { RunSubWorkflowExampleSubWorkflow } from '../../run/child.workflow';
import { RunSubWorkflowExampleFanOutWorkflow } from '../fan-out-example.workflow';

/**
 * The concept under test: `FanOutWorkflow` launches every item at once and the parent is resumed
 * exactly once, with all the children's results keyed by item name — not once per child.
 *
 * Acceptance criteria:
 *   C1 — three items produce one aggregated callback carrying all three results.
 */
describe('RunSubWorkflowExampleFanOutWorkflow', () => {
  it('C1: resumes once with every child result aggregated', async () => {
    const run = await runWorkflow(RunSubWorkflowExampleFanOutWorkflow, undefined, {
      providers: [RunSubWorkflowExampleSubWorkflow],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    // One launch, one callback — the aggregation is the whole point.
    expect(run.path).toEqual(['launch', 'onAllDone']);
    expect(run.result).toMatchObject({ hasErrors: false, errorCount: 0 });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toEqual(['Fan-out first: Hi mom!', 'Fan-out second: Hi mom!', 'Fan-out third: Hi mom!']);

    const cov = coverage([run], RunSubWorkflowExampleFanOutWorkflow);
    expect(cov.missingTransitions).toEqual([]);
  });
});
