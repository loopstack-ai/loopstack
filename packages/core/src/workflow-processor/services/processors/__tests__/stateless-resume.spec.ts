import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { executedTransitions } from '@loopstack/contracts/types';
import { ExecutionScope } from '../../../utils/index.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * A stateless run parks at a wait transition and returns its in-memory execution state
 * (`meta.statelessState`). Passing that carrier back together with a `payload.transition`
 * resumes the run in-process — no entity, no checkpoint, no DB.
 */
describe('WorkflowProcessorService — stateless park and resume', () => {
  const AUTO_TRANSITION = {
    methodName: 'begin',
    wait: false,
    to: 'awaiting_input',
    schema: undefined,
    errorPlace: undefined,
    retryAttempts: 0,
  };
  const WAIT_TRANSITION = {
    methodName: 'onSubmit',
    wait: true,
    to: 'end',
    schema: z.object({ name: z.string() }),
    errorPlace: undefined,
    retryAttempts: 0,
  };

  let service: WorkflowProcessorService;
  let workflow: object;
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const transitionResolver = {
      getAvailableTransitions: vi.fn((_wf, place: string) => {
        if (place === 'start') return [AUTO_TRANSITION];
        if (place === 'awaiting_input') return [WAIT_TRANSITION];
        return [];
      }),
      resolveNextTransition: vi.fn((_wf, available: Array<{ wait: boolean }>) => {
        return available.find((t) => !t.wait) ?? null;
      }),
    };
    onSubmit = vi.fn();
    workflow = { begin: vi.fn(), onSubmit };

    const memoryMonitor = {
      logWorkflowStart: vi.fn(),
      logWorkflowEnd: vi.fn(),
      logTransition: vi.fn(),
      logHeap: vi.fn(),
    };

    service = new WorkflowProcessorService(
      {} as never, // workflowStateService — unused when workflowEntity is undefined
      transitionResolver as never,
      new ExecutionScope(),
      memoryMonitor as never,
      {} as never, // dataSource — unused on the stateless path
      {} as never, // runTraceService — unused without a workflowEntity
      {
        now: () => Date.now(),
        schedule: (fn: () => void, ms: number) => {
          const t = setTimeout(fn, ms);
          return () => clearTimeout(t);
        },
      } as never, // clock
    );
  });

  const baseContext = {
    root: 'test',
    userId: 'u1',
    workspaceId: 'ws1',
    labels: [],
    options: { stateless: true },
  };

  it('parks at the wait transition and returns the resume carrier', async () => {
    const meta = await service.process(workflow as never, {}, { ...baseContext, payload: {} });

    expect(meta.status).toBe('waiting');
    expect(meta.place).toBe('awaiting_input');
    expect(executedTransitions(meta.trace).map((e) => e.transitionId)).toEqual(['begin']);
    expect(meta.statelessState).toMatchObject({ place: 'awaiting_input', state: {}, documents: [] });
    // The carrier carries the trace — including the park settle with what the run waits on.
    expect(meta.statelessState?.trace?.at(-1)).toMatchObject({
      type: 'run.settled',
      status: 'waiting',
      availableTransitions: ['onSubmit'],
    });
  });

  it('resumes from the carrier, preserves state, and completes', async () => {
    const meta = await service.process(
      workflow as never,
      {},
      {
        ...baseContext,
        payload: { transition: { id: 'onSubmit', workflowId: '', payload: { data: { name: 'Ada' } } } },
        statelessState: { place: 'awaiting_input', state: { counter: 7 }, documents: [] },
      },
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(meta.status).toBe('completed');
    expect(meta.place).toBe('end');
    expect(executedTransitions(meta.trace).map((e) => e.transitionId)).toEqual(['onSubmit']);
    expect(meta.statelessState?.state).toMatchObject({ counter: 7 });
  });

  it('ignores the carrier-less transition payload on a fresh stateless run', async () => {
    const meta = await service.process(
      workflow as never,
      {},
      {
        ...baseContext,
        payload: { transition: { id: 'onSubmit', workflowId: '', payload: { data: { name: 'Ada' } } } },
      },
    );

    // Without a resume carrier this is an initial run: it starts at 'start' and parks normally.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(meta.place).toBe('awaiting_input');
    expect(meta.status).toBe('waiting');
  });
});
