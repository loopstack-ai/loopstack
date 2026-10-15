import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from '../sub-workflow-error-handling.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from '../sub-workflow-failing-sub.workflow';

function messages(run: Awaited<ReturnType<typeof runWorkflow>>): string[] {
  return run.documents.map((d) => (d.content as { text?: string }).text ?? '');
}

describe('RunSubWorkflowExampleErrorHandlingWorkflow', () => {
  it('runs the onFailure transition when the child fails', async () => {
    const run = await runWorkflow(
      RunSubWorkflowExampleErrorHandlingWorkflow,
      { fail: true },
      { providers: [RunSubWorkflowExampleFailingSubWorkflow] },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['launch', 'childFailed']);
    expect(run.children).toEqual([expect.objectContaining({ status: 'failed' })]);
    expect(run.result).toEqual({
      childFailed: true,
      childStatus: 'failed',
      childErrorMessage: expect.stringContaining('Demo failure'),
    });
    expect(messages(run)).toContainEqual(expect.stringContaining('Child failed:'));
  });

  it('runs the onSuccess transition when the child completes', async () => {
    const run = await runWorkflow(
      RunSubWorkflowExampleErrorHandlingWorkflow,
      { fail: false },
      { providers: [RunSubWorkflowExampleFailingSubWorkflow] },
    );

    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['launch', 'childSucceeded']);
    expect(run.children).toEqual([expect.objectContaining({ status: 'completed' })]);
    expect(run.result).toEqual({ childFailed: false });
    expect(messages(run)).toContainEqual(expect.stringContaining('completed'));
  });
});
