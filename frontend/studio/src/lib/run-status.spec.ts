import { describe, expect, it } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import { getWorkflowStateColor, needsInput } from './run-status';

describe('needsInput', () => {
  it('flags a waiting run with nothing running under it', () => {
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 0 })).toBe(true);
  });

  it('does not flag a waiting run whose children are still working', () => {
    // The distinction the whole badge exists for: a parent parked on a child's callback carries `waiting`
    // exactly as a run holding an unanswered question does.
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 2 })).toBe(false);
  });

  it('does not flag runs that are not waiting', () => {
    for (const status of [WorkflowState.Running, WorkflowState.Completed, WorkflowState.Failed]) {
      expect(needsInput({ status, activeChildren: 0 })).toBe(false);
    }
  });
});

describe('getWorkflowStateColor', () => {
  it('makes a waiting run look different from a running one', () => {
    // It used to fall through to the default, so a run holding a question looked like one hard at work.
    expect(getWorkflowStateColor(WorkflowState.Waiting)).not.toBe(getWorkflowStateColor(WorkflowState.Running));
  });

  it('gives waiting and paused the same treatment', () => {
    expect(getWorkflowStateColor(WorkflowState.Waiting)).toBe(getWorkflowStateColor(WorkflowState.Paused));
  });
});
