import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ExecutionScope } from '../../../utils/index.js';
import { WorkflowProcessorService } from '../workflow-processor.service.js';

/**
 * A wait transition whose submitted payload fails schema validation must NOT fail the workflow.
 * It stays paused at the current place with the validation message so the caller can resubmit —
 * instead of bricking a healthy Waiting workflow.
 */
describe('WorkflowProcessorService — invalid pending payload', () => {
  const WAIT_TRANSITION = {
    methodName: 'onSubmit',
    wait: true,
    to: 'done',
    schema: z.object({ name: z.string() }),
    errorPlace: undefined,
    retryAttempts: 0,
  };

  let service: WorkflowProcessorService;
  let transitionResolver: {
    getAvailableTransitions: ReturnType<typeof vi.fn>;
    resolveNextTransition: ReturnType<typeof vi.fn>;
  };
  let onSubmit: ReturnType<typeof vi.fn>;
  let workflow: object;

  beforeEach(() => {
    transitionResolver = {
      // Only the waiting place offers the wait transition; once it advances, nothing auto-follows.
      getAvailableTransitions: vi.fn((_wf, place) => (place === 'awaiting_input' ? [WAIT_TRANSITION] : [])),
      resolveNextTransition: vi.fn().mockReturnValue(null),
    };
    onSubmit = vi.fn();
    workflow = { onSubmit };

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
      {} as never, // dataSource — unused on this path (stateless branch)
    );
  });

  const runPending = (payloadData: unknown) => {
    const meta: Record<string, unknown> = {
      hasError: false,
      stop: false,
      status: 'running',
      availableTransitions: [],
      persistenceState: { documentsUpdated: false },
      documents: [],
      place: 'awaiting_input',
      tools: {},
      result: null,
      retryCount: 0,
      version: 1,
    };
    const scopeData = {
      userId: 'u1',
      workspaceId: 'ws1',
      workflowId: 'wf1',
      labels: [],
      args: undefined,
      options: { stateless: false },
      cache: new Map(),
      queryRunner: null,
      documents: [],
      persistenceState: { documentsUpdated: false },
      transition: undefined,
      abortController: new AbortController(),
      stateDraft: {},
      resultDraft: {},
      resultDirty: false,
    };
    const pendingTransition = { id: 'onSubmit', workflowId: 'wf1', payload: { data: payloadData } };

    return (
      service as unknown as {
        processStateMachine: (
          scopeData: unknown,
          meta: unknown,
          workflow: unknown,
          pending: unknown,
          entity: unknown,
          state: unknown,
        ) => Promise<Record<string, unknown>>;
      }
    )
      .processStateMachine(scopeData, meta, workflow, pendingTransition, undefined, { existing: true })
      .then(() => meta);
  };

  it('keeps the workflow at its place and does not run the transition on invalid input', async () => {
    const meta = await runPending({ notName: 123 });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(meta.place).toBe('awaiting_input');
    expect(meta.hasError).toBe(false);
    expect(meta.errorMessage).toContain('Invalid payload');
    expect(meta.availableTransitions).toEqual([
      { id: 'onSubmit', from: 'awaiting_input', to: 'done', trigger: 'manual' },
    ]);
  });

  it('runs the transition when the payload is valid', async () => {
    const meta = await runPending({ name: 'ok' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(meta.place).toBe('done');
    expect(meta.hasError).toBe(false);
  });
});
