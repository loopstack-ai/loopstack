import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { DirectRunWorkflow } from '../direct-run.workflow';

/**
 * The workflow publishes its counts with assignResult(); that result is what
 * WorkflowRunner.runSync() hands back to DirectRunController.
 */
describe('DirectRunWorkflow', () => {
  it('publishes the word and character counts as its result', async () => {
    const run = await runWorkflow(DirectRunWorkflow, { text: 'one two  three' });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ words: 3, characters: 14 });
  });
});
