import { describe, expect, it } from 'vitest';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { runTransition } from '../run-transition.js';

interface CounterState {
  count: number;
  seen: string[];
}

@Workflow({ name: 'run_transition_counter' })
class CounterWorkflow extends BaseWorkflow {
  @Transition({ to: 'end' })
  bump(state: CounterState) {
    this.assignState({ count: state.count + 1, seen: [...state.seen, 'bump'] });
  }
}

describe('runTransition', () => {
  it('accepts a workflow interface state as an explicit type argument', async () => {
    const workflow = new CounterWorkflow();
    const seed: CounterState = { count: 1, seen: [] };

    const { state } = await runTransition<CounterState>(workflow, () => workflow.bump(seed), { state: seed });

    expect(state.count).toBe(2);
    expect(state.seen).toEqual(['bump']);
  });

  it('infers the state type from a typed seed', async () => {
    const workflow = new CounterWorkflow();
    const seed: CounterState = { count: 5, seen: ['start'] };

    const { state } = await runTransition(workflow, () => workflow.bump(seed), { state: seed });

    expect(state.count).toBe(6);
    expect(state.seen).toEqual(['start', 'bump']);
    // @ts-expect-error — the returned state is typed as CounterState, so unknown keys are rejected
    expect(state.missing).toBeUndefined();
  });

  it('returns a null result when the transition leaves the result untouched', async () => {
    const workflow = new CounterWorkflow();
    const seed: CounterState = { count: 0, seen: [] };

    const { result } = await runTransition<CounterState>(workflow, () => workflow.bump(seed), { state: seed });

    expect(result).toBeNull();
  });
});
