import { describe, expect, it } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import { getWorkflowStateColor, needsInput } from './run-status';

/** A transition the engine is holding for a submitted payload — declared `wait: true`. */
const MANUAL = [{ id: 'submit', from: 'step', to: 'end', trigger: 'manual' as const }];
const AUTOMATIC = [{ id: 'next', from: 'step', to: 'end' }];

describe('needsInput', () => {
  it('flags a waiting run holding a manual transition with nothing running under it', () => {
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 0, availableTransitions: MANUAL })).toBe(true);
  });

  it('does not flag a waiting run whose children are still working', () => {
    // The distinction the whole badge exists for: a parent parked on a child's callback carries `waiting`
    // exactly as a run holding an unanswered question does. It may even offer input — a chat box live
    // while the agent works — but nothing is blocked on you.
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 2, availableTransitions: MANUAL })).toBe(false);
  });

  it('does not flag a park the engine will resume by itself', () => {
    // A retry signal parks the run with only automatic transitions ahead of it: stopped, but unasked.
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 0, availableTransitions: AUTOMATIC })).toBe(
      false,
    );
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 0, availableTransitions: [] })).toBe(false);
    expect(needsInput({ status: WorkflowState.Waiting, activeChildren: 0, availableTransitions: null })).toBe(false);
  });

  it('does not flag runs that are not waiting', () => {
    for (const status of [WorkflowState.Running, WorkflowState.Completed, WorkflowState.Failed]) {
      expect(needsInput({ status, activeChildren: 0, availableTransitions: MANUAL })).toBe(false);
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
