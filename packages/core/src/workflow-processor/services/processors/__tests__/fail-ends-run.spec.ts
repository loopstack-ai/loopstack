import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowFailure } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import { ExecutionScope } from '../../../utils/index.js';
import { ShutdownDrainService } from '../../shutdown-drain.service.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * A transition that calls `fail()` ends the run as failed and keeps what it did: the signal takes the commit
 * path, so the transaction is committed with the error on it, and the run stops where that transition left it.
 * A thrown error of any other kind still rolls the transition back.
 */
describe('WorkflowProcessorService — a transition that fails the run', () => {
  const CLEAN = {
    methodName: 'clean',
    wait: false,
    to: 'cleaned',
    retryAttempts: 0,
    retryDelay: 0,
    retryBackoff: 'fixed',
    retryMaxDelay: 0,
  };
  const REPORT = { ...CLEAN, methodName: 'report', to: 'reported' };
  const AFTER = { ...CLEAN, methodName: 'after', to: 'end' };

  let queryRunner: Record<string, ReturnType<typeof vi.fn>>;
  let workflowStateService: {
    getLatestCheckpoint: ReturnType<typeof vi.fn>;
    saveExecutionState: ReturnType<typeof vi.fn>;
  };
  let clean: ReturnType<typeof vi.fn>;
  let after: ReturnType<typeof vi.fn>;
  /** What each save of the run carried at the moment it was made — the metadata is mutated in place. */
  let saves: { hasError: boolean; errorMessage?: string; place: string; inTransaction: boolean }[];

  const makeService = () => {
    const offered = (place: string) =>
      place === 'start' ? [CLEAN] : place === 'cleaned' ? [REPORT] : place === 'reported' ? [AFTER] : [];
    const transitionResolver = {
      getAvailableTransitions: vi.fn((_wf, place: string) => offered(place)),
      resolveNextTransition: vi.fn((_wf, available: unknown[]) => available[0] ?? null),
    };
    const memoryMonitor = { logWorkflowStart: vi.fn(), logWorkflowEnd: vi.fn(), logTransition: vi.fn() };
    return new WorkflowProcessorService(
      workflowStateService as never,
      transitionResolver as never,
      new ExecutionScope(),
      memoryMonitor as never,
      { createQueryRunner: () => queryRunner } as never,
      { isEnabled: () => false } as never, // runTraceService
      { now: () => Date.now(), schedule: () => () => undefined } as never, // clock
      new ShutdownDrainService(),
    );
  };

  const run = (report: () => void) =>
    makeService().process({ clean, report, after } as never, undefined, {
      root: 'provision',
      userId: 'u1',
      workspaceId: 'ws1',
      labels: [],
      payload: {},
      workflowEntity: {
        id: 'wf1',
        status: WorkflowState.Running,
        place: 'start',
        hasError: false,
        documents: [],
        retryCount: 0,
        result: null,
        trace: false,
      } as never,
      options: { stateless: false },
    });

  beforeEach(() => {
    clean = vi.fn();
    after = vi.fn();
    saves = [];
    workflowStateService = {
      getLatestCheckpoint: vi.fn().mockResolvedValue(null),
      saveExecutionState: vi.fn(
        (
          _entity: unknown,
          _state: unknown,
          meta: { hasError: boolean; errorMessage?: string; place: string },
          runner?: unknown,
        ) => {
          saves.push({
            hasError: meta.hasError,
            errorMessage: meta.errorMessage,
            place: meta.place,
            inTransaction: runner === queryRunner,
          });
          return Promise.resolve();
        },
      ),
    };
    queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
    };
  });

  it('commits the failing transition and settles the run as failed at its place', async () => {
    const meta = await run(() => {
      throw new WorkflowFailure('the base was left half built');
    });

    expect(clean).toHaveBeenCalledTimes(1);
    expect(meta.status).toBe(WorkflowState.Failed);
    expect(meta.errorMessage).toBe('the base was left half built');
    expect(meta.place).toBe('reported');
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(2);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('writes the failure in the same transaction as the transition', async () => {
    await run(() => {
      throw new WorkflowFailure('the base was left half built');
    });

    // The save made inside the failing transition's transaction already carries the error, so the failure
    // and whatever that transition wrote are committed together.
    const committed = saves.filter((save) => save.inTransaction).at(-1)!;
    expect(committed).toMatchObject({
      hasError: true,
      errorMessage: 'the base was left half built',
      place: 'reported',
    });
  });

  it('stops the run and offers nothing where it stopped', async () => {
    const meta = await run(() => {
      throw new WorkflowFailure('the base was left half built');
    });

    expect(after).not.toHaveBeenCalled();
    expect(meta.availableTransitions).toEqual([]);
    expect(meta.stop).toBe(true);
  });

  it('rolls the transition back when it throws anything else', async () => {
    const meta = await run(() => {
      throw new Error('the registry refused the push');
    });

    expect(meta.status).toBe(WorkflowState.Failed);
    expect(meta.errorMessage).toBe('the registry refused the push');
    // The run stays at the place the failed transition started from, with its Retry.
    expect(meta.place).toBe('cleaned');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(after).not.toHaveBeenCalled();
  });
});
