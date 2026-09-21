import { describe, expect, it } from 'vitest';
import { Guard, Transition, Workflow, buildWorkflowTransitions } from '@loopstack/common';
import { WorkflowConfigSchema } from '@loopstack/contracts/api';

/**
 * The transition list the config endpoint serves is a projection of the `@Transition` /
 * `@Guard` decorators. A guard is reported by name — there is no expression syntax to
 * mimic, because nothing evaluates one.
 */
@Workflow({ title: 'Guarded' })
class GuardedWorkflow {
  @Transition({ from: 'start', to: 'authed' })
  @Guard('needsAuth')
  checkAuth() {}

  needsAuth(): boolean {
    return true;
  }
}

@Workflow({ title: 'Waiting' })
class WaitingWorkflow {
  @Transition({ to: 'asked' })
  ask() {}

  @Transition({ from: 'asked', to: 'end', wait: true })
  onAnswer() {}
}

describe('workflow config transitions', () => {
  it('reports a guarded transition by guard method name', () => {
    expect(buildWorkflowTransitions(new GuardedWorkflow())).toEqual([
      { id: 'checkAuth', from: 'start', to: 'authed', trigger: 'onEntry', guard: 'needsAuth' },
    ]);
  });

  it('defaults `from` to start and maps wait transitions to a manual trigger', () => {
    expect(buildWorkflowTransitions(new WaitingWorkflow())).toEqual([
      { id: 'ask', from: 'start', to: 'asked', trigger: 'onEntry' },
      { id: 'onAnswer', from: 'asked', to: 'end', trigger: 'manual' },
    ]);
  });

  it('produces transitions that satisfy the response contract', () => {
    const result = WorkflowConfigSchema.safeParse({
      workflowName: 'guarded',
      transitions: buildWorkflowTransitions(new GuardedWorkflow()),
    });

    expect(result.success).toBe(true);
  });
});
