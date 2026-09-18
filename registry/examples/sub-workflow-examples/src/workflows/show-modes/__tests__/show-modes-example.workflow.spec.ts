import { describe, expect, it } from 'vitest';
import { coverage, runWorkflow } from '@loopstack/testing';
import { RunSubWorkflowExampleSubWorkflow } from '../../run/child.workflow';
import { RunSubWorkflowExampleShowModesWorkflow } from '../show-modes-example.workflow';

/**
 * The concept under test: `show` only decides how the child is rendered in the parent's stream —
 * it never changes execution. So the assertion is that all three modes behave identically:
 * three children run, and each one's callback fires with the same result.
 *
 * Acceptance criteria:
 *   C1 — inline, link and hidden each run a child and deliver its result to the callback.
 */
describe('RunSubWorkflowExampleShowModesWorkflow', () => {
  it('C1: runs a child per show mode and resumes on each callback', async () => {
    const run = await runWorkflow(RunSubWorkflowExampleShowModesWorkflow, undefined, {
      providers: [RunSubWorkflowExampleSubWorkflow],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['runInline', 'onInlineDone', 'onLinkDone', 'onHiddenDone']);
    expect(run.children).toHaveLength(3);
    expect(run.children.every((c) => c.status === 'completed')).toBe(true);

    const texts = run.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toEqual([
      'Inline child returned: Hi mom!',
      'Link child returned: Hi mom!',
      'Hidden child returned: Hi mom! — no LinkCard was rendered for it.',
    ]);

    const cov = coverage([run], RunSubWorkflowExampleShowModesWorkflow);
    expect(cov.missingTransitions).toEqual([]);
  });
});
