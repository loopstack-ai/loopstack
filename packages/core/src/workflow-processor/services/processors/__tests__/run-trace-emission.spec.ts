import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionScope } from '../../../utils/index.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * Trace emission at the processor level (stateless): started/completed pairing with duration
 * and state diff, transition.failed on a throwing transition, run.settled on every settle
 * including parks, and seq continuity across park/resume via the carrier.
 */
describe('WorkflowProcessorService — run trace emission', () => {
  const AUTO_TRANSITION = {
    methodName: 'begin',
    wait: false,
    to: 'awaiting_input',
    schema: undefined,
    errorPlace: undefined,
    retryAttempts: 0,
    retryDelay: 0,
    retryBackoff: 'fixed',
    retryMaxDelay: 0,
  };
  const WAIT_TRANSITION = {
    methodName: 'onSubmit',
    wait: true,
    to: 'end',
    schema: undefined,
    errorPlace: undefined,
    retryAttempts: 0,
    retryDelay: 0,
    retryBackoff: 'fixed',
    retryMaxDelay: 0,
  };

  let service: WorkflowProcessorService;
  let scope: ExecutionScope;

  const makeService = (transitions: { start: unknown[]; awaiting_input?: unknown[] }) => {
    const transitionResolver = {
      getAvailableTransitions: vi.fn((_wf, place: string) => {
        if (place === 'start') return transitions.start;
        if (place === 'awaiting_input') return transitions.awaiting_input ?? [];
        return [];
      }),
      resolveNextTransition: vi.fn((_wf, available: Array<{ wait: boolean }>) => {
        return available.find((t) => !t.wait) ?? null;
      }),
    };
    const memoryMonitor = {
      logWorkflowStart: vi.fn(),
      logWorkflowEnd: vi.fn(),
      logTransition: vi.fn(),
      logHeap: vi.fn(),
    };
    return new WorkflowProcessorService(
      {} as never,
      transitionResolver as never,
      scope,
      memoryMonitor as never,
      {} as never,
      {} as never, // runTraceService — unused without a workflowEntity
      {
        now: () => Date.now(),
        schedule: (fn: () => void, ms: number) => {
          const t = setTimeout(fn, ms);
          return () => clearTimeout(t);
        },
      } as never, // clock
    );
  };

  beforeEach(() => {
    scope = new ExecutionScope();
  });

  const baseContext = {
    root: 'test',
    userId: 'u1',
    workspaceId: 'ws1',
    labels: [],
    payload: {},
    options: { stateless: true },
  };

  it('pairs started/completed with duration, state diff, and park settle', async () => {
    service = makeService({ start: [AUTO_TRANSITION], awaiting_input: [WAIT_TRANSITION] });
    const workflow = {
      begin: function (this: { __executionScope?: ExecutionScope }) {
        // Mirrors assignState: mutate the scope's state draft.
        scope.get().stateDraft.greeting = 'hello';
      },
      onSubmit: vi.fn(),
    };

    const meta = await service.process(workflow as never, {}, baseContext);

    const types = meta.trace.map((e) => e.type);
    expect(types).toEqual(['transition.started', 'transition.completed', 'run.settled']);

    const [started, completed, settled] = meta.trace;
    expect(started).toMatchObject({ transitionId: 'begin', from: 'start', to: 'awaiting_input' });
    expect(completed).toMatchObject({
      transitionId: 'begin',
      stateDiff: { greeting: { after: 'hello' } },
      resultDirty: false,
    });
    expect((completed as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0);
    expect(settled).toMatchObject({ type: 'run.settled', status: 'waiting', availableTransitions: ['onSubmit'] });
  });

  it('emits transition.failed with error and retry info when the transition throws', async () => {
    service = makeService({ start: [AUTO_TRANSITION] });
    const workflow = {
      begin: () => {
        throw new Error('boom');
      },
    };

    const meta = await service.process(workflow as never, {}, baseContext);

    expect(meta.status).toBe('failed');
    const failed = meta.trace.find((e) => e.type === 'transition.failed');
    expect(failed).toMatchObject({ transitionId: 'begin', error: 'boom', willRetry: false });
    expect(meta.trace.at(-1)).toMatchObject({ type: 'run.settled', status: 'failed' });
  });

  it('continues seq across park and resume via the carrier', async () => {
    service = makeService({ start: [AUTO_TRANSITION], awaiting_input: [WAIT_TRANSITION] });
    const workflow = { begin: vi.fn(), onSubmit: vi.fn() };

    const parked = await service.process(workflow as never, {}, baseContext);
    const resumed = await service.process(
      workflow as never,
      {},
      {
        ...baseContext,
        payload: { transition: { id: 'onSubmit', workflowId: '', payload: { data: {} } } },
        statelessState: parked.statelessState,
      },
    );

    const seqs = resumed.trace.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length); // strictly monotonic — no collisions after resume
    expect(resumed.trace.map((e) => e.type)).toEqual([
      'transition.started', // begin (first call)
      'transition.completed',
      'run.settled', // park
      'transition.started', // onSubmit (resume call)
      'transition.completed',
      'run.settled', // terminal
    ]);
  });
});
