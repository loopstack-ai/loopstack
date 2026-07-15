import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext, WorkflowOrchestrator } from '@loopstack/common';
import { runTransition } from '@loopstack/testing';
import type { WorkflowRegistryService } from '../../../workflow-processor/services/workflow-registry.service.js';
import type { SequenceArgs, SequenceResult } from '../sequence.types.js';
import { SequenceWorkflow } from '../sequence.workflow.js';

class FakeWorkflowA {}
class FakeWorkflowB {}
class FakeWorkflowC {}

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
        c: FakeWorkflowC,
      };
      const ctor = ctorByName[name];
      if (!ctor) throw new Error(`Unknown workflow: ${name}`);
      return { instance: new ctor() as never, workflowName: name };
    }),
  } as unknown as WorkflowRegistryService;

  const workflow = new SequenceWorkflow(orchestrator, registry);
  return { workflow, orchestrator };
}

function ctx(args: SequenceArgs): RunContext {
  return {
    userId: 'u1',
    workspaceId: 'ws1',
    workflowId: 'parent-1',
    args: args as unknown as Record<string, unknown>,
    signal: new AbortController().signal,
    execution: { place: 'start', retryCount: 0 },
  };
}

describe('SequenceWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('queues only the first item', async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: SequenceArgs = {
        entries: [
          ['a', { workflow: 'a', args: { x: 1 } }],
          ['b', { workflow: 'b', args: { y: 2 } }],
          ['c', { workflow: 'c' }],
        ],
        itemsWereArray: true,
        mode: 'all',
      };

      const { state } = await runTransition(workflow, () => workflow.start({} as never, ctx(args)), { state: {} });

      expect(orchestrator.queue).toHaveBeenCalledTimes(1);
      expect(orchestrator.queue).toHaveBeenCalledWith(
        FakeWorkflowA,
        { x: 1 },
        expect.objectContaining({
          callback: { transition: 'onChildComplete', metadata: { key: 'a' } },
        }),
      );
      expect(state.currentIndex).toBe(0);
      expect(state.itemKeys).toEqual(['a', 'b', 'c']);
    });

    it('handles zero items — no queue, ready to complete', async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: SequenceArgs = { entries: [], itemsWereArray: true, mode: 'all' };

      const { state } = await runTransition(workflow, () => workflow.start({} as never, ctx(args)), { state: {} });

      expect(orchestrator.queue).not.toHaveBeenCalled();
      expect(state.currentIndex).toBe(0);
      expect(state.itemKeys).toEqual([]);
    });
  });

  describe('onChildComplete', () => {
    it('queues the next item after success', async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: SequenceArgs = {
        entries: [
          ['a', { workflow: 'a' }],
          ['b', { workflow: 'b' }],
        ],
        itemsWereArray: true,
        mode: 'all',
      };
      const state = {
        currentIndex: 0,
        results: {},
        itemKeys: ['a', 'b'],
        itemsWereArray: true,
        mode: 'all' as const,
        aborted: false,
      };

      const { state: next } = await runTransition(
        workflow,
        () =>
          workflow.onChildComplete(
            state,
            { workflowId: 'child-a', status: 'completed', hasError: false, errorMessage: null, data: { v: 1 } },
            ctx(args),
          ),
        { state },
      );

      expect(orchestrator.queue).toHaveBeenCalledWith(
        FakeWorkflowB,
        {},
        expect.objectContaining({
          callback: { transition: 'onChildComplete', metadata: { key: 'b' } },
        }),
      );
      expect(next.currentIndex).toBe(1);
      expect(next.results.a).toEqual({ status: 'completed', data: { v: 1 } });
    });

    it("in mode 'all', aborts and marks remaining items as skipped on failure", async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: SequenceArgs = {
        entries: [
          ['a', { workflow: 'a' }],
          ['b', { workflow: 'b' }],
          ['c', { workflow: 'c' }],
        ],
        itemsWereArray: true,
        mode: 'all',
      };
      const state = {
        currentIndex: 0,
        results: {},
        itemKeys: ['a', 'b', 'c'],
        itemsWereArray: true,
        mode: 'all' as const,
        aborted: false,
      };

      const { state: next } = await runTransition(
        workflow,
        () =>
          workflow.onChildComplete(
            state,
            { workflowId: 'child-a', status: 'failed', hasError: true, errorMessage: 'boom', data: null },
            ctx(args),
          ),
        { state },
      );

      expect(orchestrator.queue).not.toHaveBeenCalled();
      expect(next.currentIndex).toBe(3);
      expect(next.aborted).toBe(true);
      expect(next.results.a.status).toBe('failed');
      expect(next.results.b.status).toBe('skipped');
      expect(next.results.c.status).toBe('skipped');
    });

    it("in mode 'allSettled', continues past a failure", async () => {
      const { workflow, orchestrator } = makeWorkflow();
      const args: SequenceArgs = {
        entries: [
          ['a', { workflow: 'a' }],
          ['b', { workflow: 'b' }],
        ],
        itemsWereArray: true,
        mode: 'allSettled',
      };
      const state = {
        currentIndex: 0,
        results: {},
        itemKeys: ['a', 'b'],
        itemsWereArray: true,
        mode: 'allSettled' as const,
        aborted: false,
      };

      const { state: next } = await runTransition(
        workflow,
        () =>
          workflow.onChildComplete(
            state,
            { workflowId: 'child-a', status: 'failed', hasError: true, errorMessage: 'boom', data: null },
            ctx(args),
          ),
        { state },
      );

      expect(orchestrator.queue).toHaveBeenCalledWith(FakeWorkflowB, {}, expect.anything());
      expect(next.currentIndex).toBe(1);
      expect(next.results.a.status).toBe('failed');
    });
  });

  describe('done', () => {
    it('returns ordered array result when items were array', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        currentIndex: 2,
        results: {
          a: { status: 'completed' as const, data: 1 },
          b: { status: 'completed' as const, data: 2 },
        },
        itemKeys: ['a', 'b'],
        itemsWereArray: true,
        mode: 'all' as const,
        aborted: false,
      };

      const { result: rawResult } = await runTransition(workflow, () => workflow.done(state), { state });
      const result = rawResult as unknown as SequenceResult;
      expect(result.hasErrors).toBe(false);
      expect(result.results).toEqual([
        { key: 'a', status: 'completed', data: 1 },
        { key: 'b', status: 'completed', data: 2 },
      ]);
    });

    it('returns keyed record result when items were record', async () => {
      const { workflow } = makeWorkflow();
      const state = {
        currentIndex: 2,
        results: {
          first: { status: 'completed' as const, data: 1 },
          second: { status: 'skipped' as const, error: 'aborted' },
        },
        itemKeys: ['first', 'second'],
        itemsWereArray: false,
        mode: 'all' as const,
        aborted: true,
      };

      const { result: rawResult } = await runTransition(workflow, () => workflow.done(state), { state });
      const result = rawResult as unknown as SequenceResult;
      expect(result.hasErrors).toBe(true);
      expect(result.errorCount).toBe(1);
      expect(result.results).toEqual({
        first: { status: 'completed', data: 1 },
        second: { status: 'skipped', error: 'aborted' },
      });
    });
  });
});
