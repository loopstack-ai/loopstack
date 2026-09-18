import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { WorkflowStateWorkflow } from '../workflow-state-example.workflow';

/**
 * The concept under test: state assigned with `assignState()` in one transition is delivered as
 * the `state` argument of the next one. Everything else here (documents, the helper method) is
 * only the visible evidence that the value survived the hop.
 *
 * Acceptance criteria:
 *   C1 — the message assigned in `createSomeData` is readable in `showResults`.
 */
describe('WorkflowStateWorkflow', () => {
  it('C1: carries assigned state into the next transition', async () => {
    const run = await runWorkflow(WorkflowStateWorkflow);

    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createSomeData', 'showResults']);

    const texts = run.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toEqual(['Data from state: Hello :)', 'Use workflow helper method: HELLO :)']);

    const cov = coverage([run], WorkflowStateWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
