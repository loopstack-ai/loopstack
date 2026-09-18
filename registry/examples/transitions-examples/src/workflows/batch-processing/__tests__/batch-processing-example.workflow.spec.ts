import { describe, expect, it } from 'vitest';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { BatchProcessingExampleWorkflow } from '../batch-processing-example.workflow';

/**
 * The concept under test: a guarded transition loops a place back onto itself, so the state
 * machine walks a list one fixed-size batch at a time and only leaves the loop once a second
 * guard says everything is processed.
 *
 * Acceptance criteria:
 *   C1 — 7 items with a batch size of 3 take exactly 3 passes through the loop, then finish.
 *   C2 — a single full batch leaves the loop immediately, without a `nextBatch` hop.
 */
describe('BatchProcessingExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const run = async (totalItems: number, batchSize: number) => {
    const result = await runWorkflow(BatchProcessingExampleWorkflow, { totalItems, batchSize });
    runs.push(result);
    return result;
  };

  it('C1: loops once per batch until every item is processed', async () => {
    const result = await run(7, 3);

    expect(result.status).toBe('completed');
    expect(result.path).toEqual([
      'setup',
      'processBatch',
      'nextBatch',
      'processBatch',
      'nextBatch',
      'processBatch',
      'finish',
    ]);
    expect(result.document('markdown')).toMatchObject({
      markdown: expect.stringContaining('Processed 7 items in batches of 3.'),
    });
  });

  it('C2: leaves the loop after a single batch when it covers every item', async () => {
    const result = await run(3, 3);

    expect(result.status).toBe('completed');
    expect(result.path).toEqual(['setup', 'processBatch', 'finish']);
  });

  it('covers every declared transition and park (coverage gate)', () => {
    const cov = coverage(runs, BatchProcessingExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
    expect(cov.complete).toBe(true);
  });
});
