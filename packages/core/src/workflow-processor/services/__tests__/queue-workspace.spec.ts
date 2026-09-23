import { describe, expect, it, vi } from 'vitest';
import type { ExecutionScopeData } from '../../utils/index.js';
import { WorkflowOrchestrationService } from '../workflow-orchestration.service.js';

/**
 * A child normally belongs to its parent's workspace. Naming another one puts it under that workspace's
 * lock instead — which is the whole mechanism behind running work alongside the parent's own rather than
 * behind it, since tasks serialize per workspace.
 */
function scope(): ExecutionScopeData {
  return {
    userId: 'u1',
    workspaceId: 'parent-ws',
    workflowId: 'parent-wf',
    workflowName: 'parent',
    labels: [],
    args: undefined,
    options: { stateless: false },
    cache: new Map(),
    queryRunner: null,
    documents: [],
    persistenceState: { documentsUpdated: false },
    transition: { id: 't1', from: null, to: 'next', payload: {} },
    abortController: new AbortController(),
    stateDraft: {},
    resultDraft: {},
    resultDirty: false,
    trace: { emit: vi.fn() },
    tracePersist: false,
  } as unknown as ExecutionScopeData;
}

function orchestrator() {
  const create = vi.fn().mockResolvedValue({ id: 'child-wf' });
  const addTask = vi.fn().mockResolvedValue(undefined);
  const service = new WorkflowOrchestrationService(
    { get: () => scope() } as never,
    { create } as never,
    { addTask } as never,
    {} as never,
    { resolve: () => ({ instance: {}, workflowName: 'child' }) } as never,
    { save: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
  );
  return { service, create, addTask };
}

describe('WorkflowOrchestrationService.queue — workspace targeting', () => {
  it('runs the child in the parent’s workspace by default', async () => {
    const { service, create, addTask } = orchestrator();

    await service.queue({} as never, {}, {});

    expect(create.mock.calls[0][1]).toEqual({ id: 'parent-ws' });
    expect(create.mock.calls[0][2]).toMatchObject({ workspaceId: 'parent-ws' });
    // The lock the child will take is the one named on the task.
    expect(addTask.mock.calls[0][0]).toMatchObject({
      workspaceId: 'parent-ws',
      task: { workspaceId: 'parent-ws' },
    });
  });

  it('runs the child in another workspace when one is named', async () => {
    const { service, create, addTask } = orchestrator();

    await service.queue({} as never, {}, { workspaceId: 'worker-ws' });

    expect(create.mock.calls[0][1]).toEqual({ id: 'worker-ws' });
    expect(create.mock.calls[0][2]).toMatchObject({ workspaceId: 'worker-ws' });
    expect(addTask.mock.calls[0][0]).toMatchObject({
      workspaceId: 'worker-ws',
      task: { workspaceId: 'worker-ws' },
    });
  });

  it('still records the child under its parent, across the workspace boundary', async () => {
    const { service, create } = orchestrator();

    await service.queue({} as never, {}, { workspaceId: 'worker-ws' });

    // The parent id is the last argument — the callback resumes the parent in ITS own workspace, so the
    // relationship survives the child living elsewhere.
    expect(create.mock.calls[0][4]).toBe('parent-wf');
  });
});
