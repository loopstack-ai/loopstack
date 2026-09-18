import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from '../error-handling-example.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from '../failing-child.workflow';

/**
 * The concept under test: a child that throws still fires the parent's callback — the failure
 * arrives as `hasError` / `errorMessage` on the transition input rather than killing the parent.
 * So the parent must reach `end` and must have read the child's error message.
 *
 * Acceptance criteria:
 *   C1 — the parent completes despite both children failing.
 *   C2 — the callback input carries the child's status and error message.
 */
describe('RunSubWorkflowExampleErrorHandlingWorkflow', () => {
  it('C1/C2: completes and surfaces each failed child’s error to the parent', async () => {
    const run = await runWorkflow(RunSubWorkflowExampleErrorHandlingWorkflow, undefined, {
      providers: [RunSubWorkflowExampleFailingSubWorkflow],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['launchInline', 'onInlineFinished', 'onLinkFinished']);
    expect(run.children).toHaveLength(2);
    expect(run.children.every((c) => c.status === 'failed')).toBe(true);

    expect(run.result).toMatchObject({
      childStatus: 'failed',
      childErrorMessage: expect.stringContaining('wired to always throw'),
    });

    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.startsWith('Inline child failed (status="failed")'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Link child failed (status="failed")'))).toBe(true);

    const cov = coverage([run], RunSubWorkflowExampleErrorHandlingWorkflow);
    expect(cov.missingTransitions).toEqual([]);
  });
});
