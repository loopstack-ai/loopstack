import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import { ExecutionScope } from '../../../utils/index.js';
import { ShutdownDrainService } from '../../shutdown-drain.service.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * A failure is recorded and routed; whether the run carries on from the error place is the graph's business.
 * A place with an automatic transition runs it, so a clean-up path needs nobody. A place that only waits parks,
 * and the run reads as failed while it stands there. A cycle that never yields is stopped by the pass budget.
 */
describe('WorkflowProcessorService — the error route', () => {
  const base = { retryAttempts: 0, retryDelay: 0, retryBackoff: 'fixed', retryMaxDelay: 0, wait: false };
  const WORK = { ...base, methodName: 'work', to: 'worked', errorPlace: 'failed' };
  const CLEAN_UP = { ...base, methodName: 'cleanUp', to: 'end' };
  const TAKE_OVER = { ...base, methodName: 'takeOver', to: 'end', wait: true };

  let scope: ExecutionScope;

  const makeService = (offered: (place: string) => unknown[]) => {
    const transitionResolver = {
      getAvailableTransitions: vi.fn((_wf, place: string) => offered(place)),
      resolveNextTransition: vi.fn(
        (_wf, available: Array<{ wait: boolean }>) => available.find((t) => !t.wait) ?? null,
      ),
    };
    const memoryMonitor = { logWorkflowStart: vi.fn(), logWorkflowEnd: vi.fn(), logTransition: vi.fn() };
    return new WorkflowProcessorService(
      {} as never, // workflowStateService — unused without a workflowEntity
      transitionResolver as never,
      scope,
      memoryMonitor as never,
      {} as never, // dataSource
      {} as never, // runTraceService
      { now: () => Date.now(), schedule: () => () => undefined } as never,
      new ShutdownDrainService(),
    );
  };

  const context = {
    root: 'test',
    userId: 'u1',
    workspaceId: 'ws1',
    labels: [],
    payload: {},
    options: { stateless: true },
  };

  beforeEach(() => {
    scope = new ExecutionScope();
  });

  afterEach(() => {
    delete process.env.MAX_TRANSITIONS_PER_PASS;
  });

  it('runs the automatic transition at the error place and tells it why', async () => {
    const service = makeService((place) => (place === 'start' ? [WORK] : place === 'failed' ? [CLEAN_UP] : []));
    const seen: (string | undefined)[] = [];
    const workflow = {
      work: () => {
        throw new Error('the git command failed');
      },
      cleanUp: (_state: unknown, ctx: RunContext) => {
        seen.push(ctx.execution?.error);
      },
    };

    const meta = await service.process(workflow as never, {}, context);

    expect(seen).toEqual(['the git command failed']);
    expect(meta.place).toBe('end');
    // The failure was handled, so the run completed and carries no error.
    expect(meta.status).toBe(WorkflowState.Completed);
    expect(meta.hasError).toBe(false);
    expect(meta.errorMessage).toBeUndefined();
  });

  it('parks as failed when the error place only waits', async () => {
    const service = makeService((place) => (place === 'start' ? [WORK] : place === 'failed' ? [TAKE_OVER] : []));
    const workflow = {
      work: () => {
        throw new Error('the git command failed');
      },
      takeOver: vi.fn(),
    };

    const meta = await service.process(workflow as never, {}, context);

    expect(workflow.takeOver).not.toHaveBeenCalled();
    expect(meta.place).toBe('failed');
    expect(meta.status).toBe(WorkflowState.Failed);
    expect(meta.hasError).toBe(true);
    expect(meta.errorMessage).toBe('the git command failed');
    // What a person can do about it from there.
    expect(meta.availableTransitions).toEqual([{ id: 'takeOver', from: 'failed', to: 'end', trigger: 'manual' }]);
  });

  it('carries on from the error place when a wait transition is the one that failed', async () => {
    const onAnswer = { ...base, methodName: 'onAnswer', to: 'answered', wait: true, errorPlace: 'failed' };
    const service = makeService((place) => (place === 'awaiting' ? [onAnswer] : place === 'failed' ? [CLEAN_UP] : []));
    const seen: (string | undefined)[] = [];
    const workflow = {
      onAnswer: () => {
        throw new Error('the answer could not be used');
      },
      cleanUp: (_state: unknown, ctx: RunContext) => {
        seen.push(ctx.execution?.error);
      },
    };

    const meta = await service.process(workflow as never, {}, {
      ...context,
      payload: { transition: { id: 'onAnswer', workflowId: '', payload: { data: {} } } },
      statelessState: { place: 'awaiting', state: {}, documents: [], trace: [] },
    } as never);

    expect(seen).toEqual(['the answer could not be used']);
    expect(meta.place).toBe('end');
    expect(meta.status).toBe(WorkflowState.Completed);
  });

  it('stops a cycle that never yields, naming the transitions it ran', async () => {
    process.env.MAX_TRANSITIONS_PER_PASS = '6';
    const there = { ...base, methodName: 'there', to: 'back' };
    const back = { ...base, methodName: 'back', to: 'start' };
    const service = makeService((place) => (place === 'start' ? [there] : place === 'back' ? [back] : []));
    const workflow = { there: vi.fn(), back: vi.fn() };

    const meta = await service.process(workflow as never, {}, context);

    expect(meta.status).toBe(WorkflowState.Failed);
    expect(meta.errorMessage).toContain('6 transitions in one pass');
    expect(meta.errorMessage).toContain('there → back');
  });
});
