import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { WorkflowToolResultsWorkflow } from '../tool-results-example.workflow';

/**
 * The concept under test: a value produced in one transition is parked in state and read back in
 * a later one, so a step can build on what an earlier step produced.
 *
 * Acceptance criteria:
 *   C1 — the stored message is echoed by the transition that runs after it was assigned.
 */
describe('WorkflowToolResultsWorkflow', () => {
  it('C1: reads a stored result back in a later transition', async () => {
    const run = await runWorkflow(WorkflowToolResultsWorkflow);

    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createSomeData', 'accessData']);

    const texts = run.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toContain('Accessed from previous transition: Hello World.');

    const cov = coverage([run], WorkflowToolResultsWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
