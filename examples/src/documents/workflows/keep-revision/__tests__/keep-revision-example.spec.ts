import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { KeepRevisionExampleWorkflow } from '../keep-revision-example.workflow';

describe('KeepRevisionExampleWorkflow', () => {
  it('keeps the revision saved with invalidate: false live after later saves under its key', async () => {
    const run = await runWorkflow(KeepRevisionExampleWorkflow, {});

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');

    const answers = run.documents
      .filter((d) => d.key === 'answer')
      .map((d) => ({ text: (d.content as { text: string }).text, live: !d.isInvalidated }));
    expect(answers).toEqual([
      { text: 'First answer — kept for comparison', live: true },
      { text: 'Draft answer — replaced by the final answer', live: false },
      { text: 'Final answer', live: true },
    ]);
    // The latest live revision is what a read by key returns.
    expect(run.document('answer')).toEqual({ role: 'assistant', text: 'Final answer' });
  });
});
