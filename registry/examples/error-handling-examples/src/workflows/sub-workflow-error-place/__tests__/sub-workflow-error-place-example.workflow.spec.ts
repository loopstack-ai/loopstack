import { describe, expect, it } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest, runWorkflow } from '@loopstack/testing';
import { SubWorkflowErrorPlaceChildWorkflow } from '../sub-workflow-error-place-child.workflow';
import { SubWorkflowErrorPlaceExampleWorkflow } from '../sub-workflow-error-place-example.workflow';

describe('SubWorkflowErrorPlaceExampleWorkflow', () => {
  it('routes the failed child callback to the error place instead of the happy-path body', async () => {
    const run = await runWorkflow(SubWorkflowErrorPlaceExampleWorkflow, undefined, {
      providers: [SubWorkflowErrorPlaceChildWorkflow],
    });

    expect(run.children).toEqual([expect.objectContaining({ status: 'failed' })]);
    expect(run.status).toBe('failed');
    expect(run.error).toBe('Child workflow failed');
    expect(run.place).toBe('child_failed');
    // The callback transition was routed, its body never ran.
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'transition.failed', transitionId: 'childCompleted' }),
    );
    expect(run.trace).not.toContainEqual(
      expect.objectContaining({ type: 'transition.completed', transitionId: 'childCompleted' }),
    );
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['recover']);
  });

  it('completes through the recovery transition at the error place', async () => {
    const failed = await runWorkflow(SubWorkflowErrorPlaceExampleWorkflow, undefined, {
      providers: [SubWorkflowErrorPlaceChildWorkflow],
    });

    // A run that failed into its error place is resumed by triggering the recovery transition —
    // what the Recover button does. The facade's answer loop only resumes waiting runs, so the
    // processor is driven directly with the failed run's carrier.
    const module = await createWorkflowTest()
      .forWorkflow(SubWorkflowErrorPlaceExampleWorkflow)
      .withProvider(SubWorkflowErrorPlaceChildWorkflow)
      .compile();
    try {
      const recovered = await module.get(WorkflowProcessorService).process(
        module.get(SubWorkflowErrorPlaceExampleWorkflow),
        {},
        createStatelessContext({
          payload: { transition: { id: 'recover', workflowId: '', payload: {} } },
          statelessState: failed.raw.statelessState,
        }),
      );

      expect(recovered.status).toBe('completed');
      expect(recovered.result).toEqual({ recovered: true });
    } finally {
      await module.close();
    }
  });
});
