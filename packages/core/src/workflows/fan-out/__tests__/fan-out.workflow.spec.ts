import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext, WorkflowOrchestrator } from '@loopstack/common';
import type { WorkflowRegistryService } from '../../../workflow-processor/services/workflow-registry.service.js';
import type { FanOutArgs, FanOutResult } from '../fan-out.types.js';
import { FanOutWorkflow } from '../fan-out.workflow.js';

class FakeWorkflowA {}
class FakeWorkflowB {}

function makeWorkflow() {
  const orchestrator = {
    queue: vi.fn().mockResolvedValue({ workflowId: 'queued' }),
    resume: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    cancelChildren: vi.fn(),
  } satisfies WorkflowOrchestrator;

  const registry = {
    resolve: vi.fn((name: string) => {
      const ctorByName: Record<string, new () => unknown> = {
        a: FakeWorkflowA,
        b: FakeWorkflowB,
      };
      const ctor = ctorByName[name];
      if (!ctor) throw new Error(`Unknown workflow: ${name}`);
      return { instance: new ctor() as never, workflowName: name };
    }),
  } as unknown as WorkflowRegistryService;

  const workflow = new FanOutWorkflow(orchestrator, registry);
  return { workflow, orchestrator, registry };
}

function ctx(args: FanOutArgs, workflowId = 'parent-1'): RunContext {
  return {
    userId: 'u1',
    workspaceId: 'ws1',
    workflowId,
    args: args as unknown as Record<string, unknown>,
    execution: { place: 'start', retryCount: 0 },
  };
}

describe('FanOutWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('queues every item and initializes state with pendingCount = N', async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: FanOutArgs = {
        entries: [
          ['a', { workflow: 'a', args: { x: 1 } }],
          ['b', { workflow: 'b', args: { y: 2 } }],
        ],
        itemsWereArray: false,
        mode: 'all',
      };

      const state = await workflow.start({} as never, ctx(args));

      expect(orchestrator.queue).toHaveBeenCalledTimes(2);
      expect(orchestrator.queue).toHaveBeenNthCalledWith(
        1,
        FakeWorkflowA,
        { x: 1 },
        expect.objectContaining({
          callback: { transition: 'onChildComplete', metadata: { key: 'a' } },
        }),
      );
      expect(state.pendingCount).toBe(2);
      expect(state.itemKeys).toEqual(['a', 'b']);
      expect(state.results).toEqual({});
    });

    it('handles zero items — pendingCount = 0, ready to immediately complete', async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: FanOutArgs = { entries: [], itemsWereArray: true, mode: 'all' };

      const state = await workflow.start({} as never, ctx(args));

      expect(orchestrator.queue).not.toHaveBeenCalled();
      expect(state.pendingCount).toBe(0);
    });
  });

  describe('onChildComplete', () => {
    it('records a completed child and decrements pendingCount', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        pendingCount: 2,
        results: {},
        itemKeys: ['a', 'b'],
        itemsWereArray: false,
        mode: 'all' as const,
      };

      const next = await workflow.onChildComplete(
        state,
        { status: 'completed', data: { v: 1 }, _subscriberMetadata: { key: 'a' } },
        ctx({ entries: [], itemsWereArray: false, mode: 'all' }),
      );

      expect(next.pendingCount).toBe(1);
      expect(next.results.a).toEqual({ status: 'completed', data: { v: 1 } });
    });

    it("in mode 'all', a failed child triggers cancelChildren on the parent", async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const state = {
        pendingCount: 2,
        results: {},
        itemKeys: ['a', 'b'],
        itemsWereArray: false,
        mode: 'all' as const,
      };

      const next = await workflow.onChildComplete(
        state,
        { status: 'failed', _subscriberMetadata: { key: 'a' } },
        ctx({ entries: [], itemsWereArray: false, mode: 'all' }, 'parent-99'),
      );

      expect(orchestrator.cancelChildren).toHaveBeenCalledWith('parent-99');
      expect(next.results.a.status).toBe('failed');
    });

    it("in mode 'allSettled', a failed child does NOT trigger cancelChildren", async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const state = {
        pendingCount: 2,
        results: {},
        itemKeys: ['a', 'b'],
        itemsWereArray: false,
        mode: 'allSettled' as const,
      };

      await workflow.onChildComplete(
        state,
        { status: 'failed', _subscriberMetadata: { key: 'a' } },
        ctx({ entries: [], itemsWereArray: false, mode: 'allSettled' }),
      );

      expect(orchestrator.cancelChildren).not.toHaveBeenCalled();
    });

    it('throws when the callback is missing a correlation key', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        pendingCount: 1,
        results: {},
        itemKeys: ['a'],
        itemsWereArray: false,
        mode: 'all' as const,
      };

      await expect(
        workflow.onChildComplete(
          state,
          { status: 'completed', data: {} },
          ctx({ entries: [], itemsWereArray: false, mode: 'all' }),
        ),
      ).rejects.toThrow(/correlation key/);
    });
  });

  describe('done', () => {
    it('returns a keyed-record result when items were a record', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        pendingCount: 0,
        results: {
          a: { status: 'completed' as const, data: 1 },
          b: { status: 'failed' as const, error: 'boom' },
        },
        itemKeys: ['a', 'b'],
        itemsWereArray: false,
        mode: 'allSettled' as const,
      };

      const result = (await workflow.done(state)) as FanOutResult;

      expect(result.hasErrors).toBe(true);
      expect(result.errorCount).toBe(1);
      expect(result.results).toEqual({
        a: { status: 'completed', data: 1 },
        b: { status: 'failed', error: 'boom' },
      });
    });

    it('returns an ordered-array result when items were an array', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        pendingCount: 0,
        results: {
          '0': { status: 'completed' as const, data: 'first' },
          '1': { status: 'completed' as const, data: 'second' },
        },
        itemKeys: ['0', '1'],
        itemsWereArray: true,
        mode: 'all' as const,
      };

      const result = (await workflow.done(state)) as FanOutResult;

      expect(result.hasErrors).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.results).toEqual([
        { key: '0', status: 'completed', data: 'first' },
        { key: '1', status: 'completed', data: 'second' },
      ]);
    });

    it('marks missing callbacks as failed (no callback received)', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        pendingCount: 0,
        results: { a: { status: 'completed' as const, data: 1 } },
        itemKeys: ['a', 'b'],
        itemsWereArray: false,
        mode: 'allSettled' as const,
      };

      const result = (await workflow.done(state)) as FanOutResult;
      const results = result.results as Record<string, { status: string; error?: string }>;

      expect(results.b.status).toBe('failed');
      expect(results.b.error).toMatch(/No callback received/);
      expect(result.errorCount).toBe(1);
    });
  });
});
