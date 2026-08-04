import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executedTransitions } from '@loopstack/contracts/types';
import { ExecutionScope } from '../../../utils/index.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * Stateless sub-workflow callbacks: an inline-executed child queues its callback envelope on the
 * scope (`statelessCallbacks`); after the parent parks, the processor drains the queue by applying
 * each envelope as a pending transition — completing the parent in a single `process()` call.
 */
describe('WorkflowProcessorService — stateless callback drain', () => {
  const BEGIN = {
    methodName: 'begin',
    wait: false,
    to: 'waiting_children',
    schema: undefined,
    errorPlace: undefined,
    retryAttempts: 0,
  };
  const CHILD_WAIT = {
    methodName: 'onChildDone',
    wait: true,
    to: 'end',
    schema: undefined,
    errorPlace: undefined,
    retryAttempts: 0,
  };
  const OTHER_WAIT = {
    methodName: 'onOther',
    wait: true,
    to: 'end',
    schema: undefined,
    errorPlace: undefined,
    retryAttempts: 0,
  };

  let scope: ExecutionScope;
  let service: WorkflowProcessorService;
  let onChildDone: ReturnType<typeof vi.fn>;

  const makeService = (waitAtChildren: Array<Record<string, unknown>>) => {
    const transitionResolver = {
      getAvailableTransitions: vi.fn((_wf, place: string) => {
        if (place === 'start') return [BEGIN];
        if (place === 'waiting_children') return waitAtChildren;
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

  // Simulates what WorkflowOrchestrationService.queueInline does when an inline child completes:
  // the transition body queues the child's callback envelope on the active scope.
  const beginQueuingChildCallback = () =>
    vi.fn(() => {
      const s = scope.get();
      (s.statelessCallbacks ??= []).push({
        id: 'onChildDone',
        workflowId: '',
        payload: {
          workflowId: 'stateless-child-1',
          status: 'completed',
          hasError: false,
          errorMessage: null,
          data: { answer: 42 },
        },
      });
    });

  beforeEach(() => {
    scope = new ExecutionScope();
    onChildDone = vi.fn();
  });

  const baseContext = {
    root: 'test',
    userId: 'u1',
    workspaceId: 'ws1',
    labels: [],
    payload: {},
    options: { stateless: true },
  };

  it('applies the queued child callback after the parent parks and completes the run', async () => {
    service = makeService([CHILD_WAIT]);
    const workflow = { begin: beginQueuingChildCallback(), onChildDone };

    const meta = await service.process(workflow as never, {}, baseContext);

    expect(meta.status).toBe('completed');
    expect(meta.place).toBe('end');
    expect(executedTransitions(meta.trace).map((e) => e.transitionId)).toEqual(['begin', 'onChildDone']);
    expect(onChildDone).toHaveBeenCalledTimes(1);
    expect(meta.statelessState?.callbacks).toBeUndefined(); // fully drained
    expect(meta.statelessState?.children).toBeUndefined(); // simulated child — no record
  });

  it('keeps a non-applicable callback queued in the carrier when the parent parks elsewhere', async () => {
    service = makeService([OTHER_WAIT]); // 'onChildDone' is not available at waiting_children
    const workflow = { begin: beginQueuingChildCallback(), onChildDone, onOther: vi.fn() };

    const meta = await service.process(workflow as never, {}, baseContext);

    expect(meta.status).toBe('waiting');
    expect(meta.place).toBe('waiting_children');
    expect(onChildDone).not.toHaveBeenCalled();
    expect(meta.statelessState?.callbacks).toHaveLength(1);
    expect(meta.statelessState?.callbacks?.[0].id).toBe('onChildDone');
  });

  it('restores queued callbacks from the resume carrier', async () => {
    service = makeService([CHILD_WAIT]);
    const workflow = { begin: vi.fn(), onChildDone };

    const meta = await service.process(
      workflow as never,
      {},
      {
        ...baseContext,
        statelessState: {
          place: 'waiting_children',
          state: {},
          documents: [],
          callbacks: [
            {
              id: 'onChildDone',
              workflowId: '',
              payload: { workflowId: 'stateless-child-1', status: 'completed', hasError: false, data: null },
            },
          ],
        },
      },
    );

    expect(meta.status).toBe('completed');
    expect(executedTransitions(meta.trace).map((e) => e.transitionId)).toEqual(['onChildDone']);
  });
});
