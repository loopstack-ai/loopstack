import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { SubWorkflowFailureChildWorkflow } from '../sub-workflow-failure-child.workflow';
import { SubWorkflowFailureExampleWorkflow } from '../sub-workflow-failure-example.workflow';

describe('SubWorkflowFailureExampleWorkflow', () => {
  it('runs the onFailure transition instead of the success body', async () => {
    const run = await runWorkflow(SubWorkflowFailureExampleWorkflow, undefined, {
      providers: [SubWorkflowFailureChildWorkflow],
    });

    expect(run.children).toEqual([expect.objectContaining({ status: 'failed' })]);
    // The parent handled the failure, so it waits for the recovery rather than failing itself.
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('child_failed');
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'transition.completed', transitionId: 'childFailed' }),
    );
    expect(run.trace).not.toContainEqual(
      expect.objectContaining({ type: 'transition.started', transitionId: 'childCompleted' }),
    );
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['recover']);
  });

  it('completes through the recovery transition', async () => {
    const run = await runWorkflow(SubWorkflowFailureExampleWorkflow, undefined, {
      providers: [SubWorkflowFailureChildWorkflow],
      answers: { recover: {} },
    });

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ recovered: true });
  });
});
