import { describe, expect, it, vi } from 'vitest';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';
import { WORKFLOW_SETTLED } from '../../events/index.js';
import { WorkflowOrchestrationService } from '../workflow-orchestration.service.js';

/**
 * Every path that settles a run calls `complete()` — a processing pass that reached a terminal state, a task
 * the queue gave up on, and a cancellation — so that is where the end of a run is announced. The event
 * exists for listeners that release what they were holding for the run, which is why it has to fire for a
 * run with no parent to call back as well.
 */
function service(emit = vi.fn()) {
  const resume = vi.fn().mockResolvedValue(undefined);
  const orchestration = new WorkflowOrchestrationService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { emit } as never,
  );
  // The parent callback goes through `resume`, which is not what this spec is about.
  orchestration.resume = resume;
  return { orchestration, emit, resume };
}

function workflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
  return {
    id: 'wf-1',
    workspaceId: 'ws-1',
    workflowName: 'engineer_ticket',
    createdBy: 'user-1',
    parentId: null,
    callbackTransition: null,
    status: WorkflowState.Completed,
    hasError: false,
    errorMessage: null,
    result: null,
    ...overrides,
  } as WorkflowEntity;
}

describe('workflow.settled', () => {
  it('announces a settled run that has no parent to call back', async () => {
    const { orchestration, emit } = service();

    await orchestration.complete(workflow());

    expect(emit).toHaveBeenCalledWith(WORKFLOW_SETTLED, {
      id: 'wf-1',
      workspaceId: 'ws-1',
      workflowName: 'engineer_ticket',
      status: WorkflowState.Completed,
      user: 'user-1',
    });
  });

  it.each([WorkflowState.Completed, WorkflowState.Failed, WorkflowState.Canceled])(
    'announces a run that settled as %s',
    async (status) => {
      const { orchestration, emit } = service();

      await orchestration.complete(workflow({ status }));

      expect(emit.mock.calls[0][1]).toMatchObject({ status });
    },
  );

  it('names the parent, so a listener can tell a sub-workflow from a root run', async () => {
    const { orchestration, emit } = service();

    await orchestration.complete(workflow({ parentId: 'parent-1', callbackTransition: 'onDone' }));

    expect(emit.mock.calls[0][1]).toMatchObject({ parentId: 'parent-1' });
  });

  it.each([WorkflowState.Running, WorkflowState.Waiting, WorkflowState.Pending, WorkflowState.Paused])(
    'says nothing about a run that is still %s',
    async (status) => {
      const { orchestration, emit } = service();

      await orchestration.complete(workflow({ status }));

      expect(emit).not.toHaveBeenCalled();
    },
  );

  it('still calls the parent back when a listener throws', async () => {
    // A listener releasing a resource is nobody's business but its own, and the parent is still owed its turn.
    const emit = vi.fn(() => {
      throw new Error('listener exploded');
    });
    const { orchestration, resume } = service(emit);

    await orchestration.complete(workflow({ parentId: 'parent-1', callbackTransition: 'onDone' }));

    expect(resume).toHaveBeenCalledWith('parent-1', expect.objectContaining({ workflowId: 'wf-1' }), {
      transition: 'onDone',
    });
  });
});
