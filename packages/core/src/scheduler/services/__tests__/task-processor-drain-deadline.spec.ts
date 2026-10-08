import type { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledTask } from '@loopstack/contracts/types';
import { ShutdownDrainService } from '../../../workflow-processor/services/shutdown-drain.service.js';
import { DEFAULT_SHUTDOWN_DRAIN_TIMEOUT_MS, TaskProcessorService } from '../task-processor.service.js';
import { WorkspaceLockService } from '../workspace-lock.service.js';

/**
 * A shutdown waits for in-flight runs to yield, but not forever: a transition that cannot yield — one long
 * await — must not hold the process hostage. Past the deadline, or on a second signal, the worker closes by
 * force and the queue takes over after restart.
 */
describe('TaskProcessorService — bounded drain on shutdown', () => {
  let worker: { pause: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let drain: ShutdownDrainService;
  let processor: TaskProcessorService;
  let finishRun: () => void;
  let signalHandlers: Map<string, (signal: string) => void>;

  const job = (id: string) =>
    ({
      id,
      updateProgress: vi.fn().mockResolvedValue(undefined),
      data: {
        id: `task-${id}`,
        workspaceId: 'ws1',
        task: {
          name: 'run',
          type: 'run_workflow',
          workflowId: `wf-${id}`,
          workflowName: 'Build',
          payload: {},
          user: 'u1',
        },
      },
    }) as unknown as Job<ScheduledTask>;

  beforeEach(() => {
    vi.useFakeTimers();
    delete process.env.SHUTDOWN_DRAIN_TIMEOUT_MS;

    signalHandlers = new Map();
    vi.spyOn(process, 'once').mockImplementation(((event: string, handler: (signal: string) => void) => {
      signalHandlers.set(event, handler);
      return process;
    }) as typeof process.once);
    vi.spyOn(process, 'removeListener').mockImplementation(((event: string) => {
      signalHandlers.delete(event);
      return process;
    }) as typeof process.removeListener);

    const runner = {
      process: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishRun = resolve;
          }),
      ),
    };
    worker = { pause: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    drain = new ShutdownDrainService();
    processor = new TaskProcessorService(runner as never, new WorkspaceLockService(), drain);
    (processor as unknown as { _worker: unknown })._worker = worker;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.SHUTDOWN_DRAIN_TIMEOUT_MS;
  });

  it('closes at once when nothing is in flight', async () => {
    await processor.beforeApplicationShutdown();

    expect(drain.draining).toBe(true);
    expect(worker.pause).toHaveBeenCalledWith(true);
    expect(worker.close).toHaveBeenCalledWith(false);
    expect(signalHandlers.size).toBe(0);
  });

  it('closes cleanly once the in-flight run has yielded', async () => {
    const running = processor.process(job('1'));
    await vi.advanceTimersByTimeAsync(0);

    const shutdown = processor.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(0);
    expect(worker.close).not.toHaveBeenCalled();

    finishRun();
    await running;
    await shutdown;

    expect(worker.close).toHaveBeenCalledWith(false);
    expect(signalHandlers.size).toBe(0);
  });

  it('closes by force once the deadline has passed', async () => {
    void processor.process(job('1'));
    await vi.advanceTimersByTimeAsync(0);

    const shutdown = processor.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(DEFAULT_SHUTDOWN_DRAIN_TIMEOUT_MS - 1);
    expect(worker.close).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await shutdown;

    expect(worker.close).toHaveBeenCalledWith(true);
    expect(signalHandlers.size).toBe(0);
  });

  it('takes the deadline from SHUTDOWN_DRAIN_TIMEOUT_MS', async () => {
    process.env.SHUTDOWN_DRAIN_TIMEOUT_MS = '500';
    void processor.process(job('1'));
    await vi.advanceTimersByTimeAsync(0);

    const shutdown = processor.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(500);
    await shutdown;

    expect(worker.close).toHaveBeenCalledWith(true);
  });

  it('closes by force on a second signal', async () => {
    void processor.process(job('1'));
    await vi.advanceTimersByTimeAsync(0);

    const shutdown = processor.beforeApplicationShutdown();
    await vi.advanceTimersByTimeAsync(0);
    expect([...signalHandlers.keys()].sort()).toEqual(['SIGINT', 'SIGTERM']);

    signalHandlers.get('SIGINT')!('SIGINT');
    await shutdown;

    expect(worker.close).toHaveBeenCalledWith(true);
    expect(signalHandlers.size).toBe(0);
  });
});
