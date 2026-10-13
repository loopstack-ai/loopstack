import { describe, expect, it } from 'vitest';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { CheckpointsExampleWorkflow } from '../checkpoints-example.workflow';

/**
 * The checkpoint history of a run is its path: one row per place it passed. `run.path` is the
 * in-process view of the same path — the transition ids the history carries as `transitionId`.
 */
describe('CheckpointsExampleWorkflow', () => {
  const runs: TestRun[] = [];

  it('takes the approved path for an amount within the limit', async () => {
    const run = await runWorkflow(CheckpointsExampleWorkflow, { amount: 100 });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['receive', 'autoApprove', 'finishApproved']);
  });

  it('takes the flagged path for an amount above the limit', async () => {
    const run = await runWorkflow(CheckpointsExampleWorkflow, { amount: 900 });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['receive', 'flagForReview', 'finishFlagged']);
  });

  it('covers every transition (coverage gate)', () => {
    expect(coverage(runs, CheckpointsExampleWorkflow).missingTransitions).toEqual([]);
  });
});
