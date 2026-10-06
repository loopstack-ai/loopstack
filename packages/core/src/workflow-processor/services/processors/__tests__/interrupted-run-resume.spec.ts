import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowState } from '@loopstack/contracts/enums';
import { ExecutionScope } from '../../../utils/index.js';
import { ShutdownDrainService } from '../../shutdown-drain.service.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * A stateful run whose task carries no transition continues from its current place — the case of a task
 * redelivered after its process died mid-run, of a drain continuation, and of a plain "run" on a parked
 * workflow. A draining shutdown stops a run before its next auto transition and asks for a continuation.
 */
describe('WorkflowProcessorService — interrupted and draining runs', () => {
  const STREAM = {
    methodName: 'stream',
    wait: false,
    to: 'running',
    retryAttempts: 0,
    retryDelay: 0,
    retryBackoff: 'fixed',
    retryMaxDelay: 0,
  };
  const ON_ANSWER = { ...STREAM, methodName: 'onAnswer', wait: true, to: 'end' };

  let drain: ShutdownDrainService;
  let workflowStateService: {
    getLatestCheckpoint: ReturnType<typeof vi.fn>;
    saveExecutionState: ReturnType<typeof vi.fn>;
  };
  let queryRunner: Record<string, ReturnType<typeof vi.fn>>;
  let stream: ReturnType<typeof vi.fn>;
  let streamCalls: number;

  const makeService = (offered: (place: string) => unknown[]) => {
    const transitionResolver = {
      getAvailableTransitions: vi.fn((_wf, place: string) => offered(place)),
      // `stream` is offered until it has run once — the session finishing — so the loop ends.
      resolveNextTransition: vi.fn((_wf, available: Array<{ wait: boolean }>) =>
        streamCalls === 0 ? (available.find((t) => !t.wait) ?? null) : null,
      ),
    };
    const memoryMonitor = { logWorkflowStart: vi.fn(), logWorkflowEnd: vi.fn(), logTransition: vi.fn() };
    const dataSource = { createQueryRunner: () => queryRunner };
    return new WorkflowProcessorService(
      workflowStateService as never,
      transitionResolver as never,
      new ExecutionScope(),
      memoryMonitor as never,
      dataSource as never,
      { isEnabled: () => false } as never, // runTraceService
      { now: () => Date.now(), schedule: () => () => undefined } as never, // clock
      drain,
    );
  };

  const run = (service: WorkflowProcessorService, place: string) =>
    service.process({ stream } as never, undefined, {
      root: 'session',
      userId: 'u1',
      workspaceId: 'ws1',
      labels: [],
      // What a redelivered sub-workflow task carries: no transition.
      payload: {},
      workflowEntity: {
        id: 'wf1',
        status: WorkflowState.Running,
        place,
        hasError: false,
        documents: [],
        retryCount: 0,
        result: null,
        trace: false,
      } as never,
      options: { stateless: false },
    });

  /** The status the run was last saved with. */
  const savedStatus = () => workflowStateService.saveExecutionState.mock.calls.at(-1)?.[2].status;

  beforeEach(() => {
    drain = new ShutdownDrainService();
    streamCalls = 0;
    stream = vi.fn(() => {
      streamCalls++;
    });
    workflowStateService = {
      getLatestCheckpoint: vi.fn().mockResolvedValue({
        version: 7,
        state: { sessionId: 's1', offset: 1234, finished: false },
      }),
      saveExecutionState: vi.fn().mockResolvedValue(undefined),
    };
    queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
    };
  });

  it('continues an interrupted run from its last checkpoint', async () => {
    const service = makeService((place) => (place === 'running' ? [STREAM] : []));

    const meta = await run(service, 'running');

    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream.mock.calls[0][0]).toEqual({ sessionId: 's1', offset: 1234, finished: false });
    expect(meta.status).toBe(WorkflowState.Waiting);
    expect(savedStatus()).toBe(WorkflowState.Waiting);
  });

  it('settles a parked run back to waiting without running anything', async () => {
    const service = makeService((place) => (place === 'awaiting_answer' ? [ON_ANSWER] : []));

    const meta = await run(service, 'awaiting_answer');

    expect(stream).not.toHaveBeenCalled();
    expect(meta.status).toBe(WorkflowState.Waiting);
    expect(savedStatus()).toBe(WorkflowState.Waiting);
  });

  it('yields before the next transition while draining, still running and asking for a continuation', async () => {
    const service = makeService((place) => (place === 'running' ? [STREAM] : []));
    drain.begin();

    const meta = await run(service, 'running');

    expect(stream).not.toHaveBeenCalled();
    expect(meta._continueSignal).toBe(true);
    expect(meta.place).toBe('running');
    expect(meta.status).toBe(WorkflowState.Running);
    expect(savedStatus()).toBe(WorkflowState.Running);
  });
});
