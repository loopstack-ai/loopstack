import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { ExecutionScope, ExecutionScopeData, RunTraceCollector } from '../../utils/index.js';
import { ToolPipelineService } from '../tool-pipeline.service.js';

@Tool({ name: 'sum', schema: z.object({ a: z.number(), b: z.number() }) })
class SumTool extends BaseTool<{ a: number; b: number }, object, number> {
  protected async handle(args: { a: number; b: number }): Promise<ToolEnvelope<number>> {
    return Promise.resolve({ data: args.a + args.b });
  }
}

@Tool({ name: 'throwing' })
class ThrowingTool extends BaseTool<object, object, never> {
  protected async handle(): Promise<ToolEnvelope<never>> {
    return Promise.reject(new Error('exploded'));
  }
}

@Tool({ name: 'configured', configSchema: z.object({ label: z.string() }) })
class ConfiguredTool extends BaseTool<object, { label: string }, string> {
  protected async handle(
    _args: object,
    _ctx: never,
    options?: { config?: { label: string } },
  ): Promise<ToolEnvelope<string>> {
    return Promise.resolve({ data: options?.config?.label ?? 'none' });
  }
}

describe('ToolPipelineService — trace emission', () => {
  const makeScopeData = (trace: RunTraceCollector): ExecutionScopeData =>
    ({
      userId: 'u1',
      workspaceId: 'ws1',
      workflowId: 'wf1',
      workflowName: 'test_workflow',
      labels: [],
      args: undefined,
      options: { stateless: true },
      cache: new Map(),
      queryRunner: null,
      documents: [],
      persistenceState: { documentsUpdated: false },
      transition: { id: 'work', from: 'a', to: 'b', payload: null },
      trace,
      tracePersist: false,
      abortController: new AbortController(),
      stateDraft: {},
      resultDraft: {},
      resultDirty: false,
    }) as ExecutionScopeData;

  it('emits tool.called and tool.completed with args, envelope, toolSeq, and duration', async () => {
    const scope = new ExecutionScope();
    const pipeline = new ToolPipelineService(scope, {} as never);
    const trace = new RunTraceCollector();

    await scope.run(makeScopeData(trace), async () => {
      await pipeline.execute(new SumTool(), { a: 1, b: 2 });
      await pipeline.execute(new SumTool(), { a: 3, b: 4 });
    });

    expect(trace.events.map((e) => e.type)).toEqual(['tool.called', 'tool.completed', 'tool.called', 'tool.completed']);
    expect(trace.events[0]).toMatchObject({ transitionId: 'work', toolName: 'sum', toolSeq: 0, args: { a: 1, b: 2 } });
    expect(trace.events[1]).toMatchObject({ toolSeq: 0, envelope: { data: 3 } });
    expect(trace.events[2]).toMatchObject({ toolSeq: 1 });
    expect((trace.events[1] as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0);
  });

  it('carries the validated config on tool events, absent when the call has none', async () => {
    const scope = new ExecutionScope();
    const pipeline = new ToolPipelineService(scope, {} as never);
    const trace = new RunTraceCollector();

    await scope.run(makeScopeData(trace), async () => {
      await pipeline.execute(new ConfiguredTool(), {}, { config: { label: 'hi' } });
      await pipeline.execute(new SumTool(), { a: 1, b: 1 });
    });

    expect(trace.events[0]).toMatchObject({ type: 'tool.called', config: { label: 'hi' } });
    expect(trace.events[1]).toMatchObject({
      type: 'tool.completed',
      config: { label: 'hi' },
      envelope: { data: 'hi' },
    });
    expect('config' in trace.events[2]).toBe(false);
    expect('config' in trace.events[3]).toBe(false);
  });

  it('emits tool.failed on a throw and still propagates the error', async () => {
    const scope = new ExecutionScope();
    const pipeline = new ToolPipelineService(scope, {} as never);
    const trace = new RunTraceCollector();

    await expect(scope.run(makeScopeData(trace), () => pipeline.execute(new ThrowingTool(), {}))).rejects.toThrow(
      'exploded',
    );

    expect(trace.events.map((e) => e.type)).toEqual(['tool.called', 'tool.failed']);
    expect(trace.events[1]).toMatchObject({ toolName: 'throwing', error: 'exploded' });
  });

  it('executes without a scope (no trace) unchanged', async () => {
    const pipeline = new ToolPipelineService(new ExecutionScope(), {} as never);

    const envelope = await pipeline.execute(new SumTool(), { a: 2, b: 5 });

    expect(envelope.data).toBe(7);
  });
});
