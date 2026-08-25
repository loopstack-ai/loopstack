import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope, parseToolResult } from '@loopstack/common';
import { ExecutionScope } from '../../utils/index.js';
import { ToolPipelineService } from '../tool-pipeline.service.js';

const SumResultSchema = z.strictObject({
  total: z.number(),
  label: z.string().default('sum'),
});

@Tool({
  name: 'strict_sum',
  schema: z.object({ a: z.number(), b: z.number() }),
  resultSchema: SumResultSchema,
})
class StrictSumTool extends BaseTool<{ a: number; b: number }, object, z.infer<typeof SumResultSchema>> {
  protected async handle(args: { a: number; b: number }): Promise<ToolEnvelope<z.infer<typeof SumResultSchema>>> {
    return Promise.resolve({ data: { total: args.a + args.b } as z.infer<typeof SumResultSchema> });
  }
}

@Tool({ name: 'drifting', resultSchema: z.strictObject({ total: z.number() }) })
class DriftingTool extends BaseTool<object, object, { total: number }> {
  protected async handle(): Promise<ToolEnvelope<{ total: number }>> {
    return Promise.resolve({ data: { total: 1, extra: true } as never });
  }
}

@Tool({ name: 'no_contract' })
class NoContractTool extends BaseTool<object, object, unknown> {
  protected async handle(): Promise<ToolEnvelope<unknown>> {
    return Promise.resolve({ data: { anything: 'goes' } });
  }
}

@Tool({ name: 'erroring', resultSchema: z.strictObject({ total: z.number() }) })
class ErroringTool extends BaseTool<object, object, { total: number }> {
  protected async handle(): Promise<ToolEnvelope<{ total: number }>> {
    return Promise.resolve({ data: { malformed: true } as never, error: 'boom' });
  }
}

const makePipeline = () => new ToolPipelineService(new ExecutionScope(), {} as never, {} as never);

describe('parseToolResult', () => {
  it('parses success data and applies schema defaults without mutating the input envelope', () => {
    const tool = new StrictSumTool();
    const envelope: ToolEnvelope = { data: { total: 3 }, metadata: { m: 1 } };

    const parsed = parseToolResult(tool, envelope);

    expect(parsed).not.toBe(envelope);
    expect(parsed.data).toEqual({ total: 3, label: 'sum' });
    expect(parsed.metadata).toEqual({ m: 1 });
    expect(envelope.data).toEqual({ total: 3 }); // input untouched — recorders keep raw output
  });

  it('rejects unknown keys with an error naming the tool', () => {
    const tool = new DriftingTool();

    expect(() => parseToolResult(tool, { data: { total: 1, extra: true } })).toThrow(
      /Tool 'drifting' result violates its resultSchema/,
    );
  });

  it('passes error and pending envelopes through untouched', () => {
    const tool = new DriftingTool();
    const errorEnvelope: ToolEnvelope = { data: { malformed: true }, error: 'boom' };
    const pendingEnvelope: ToolEnvelope = { data: { workflowId: 'wf1' }, pending: { workflowId: 'wf1' } };

    expect(parseToolResult(tool, errorEnvelope)).toBe(errorEnvelope);
    expect(parseToolResult(tool, pendingEnvelope)).toBe(pendingEnvelope);
  });

  it('passes envelopes of tools without a resultSchema through untouched', () => {
    const tool = new NoContractTool();
    const envelope: ToolEnvelope = { data: { anything: 'goes' } };

    expect(parseToolResult(tool, envelope)).toBe(envelope);
  });
});

describe('ToolPipelineService result validation', () => {
  it('returns the normalized envelope for a valid result', async () => {
    const pipeline = makePipeline();

    const envelope = await pipeline.execute(new StrictSumTool(), { a: 1, b: 2 });

    expect(envelope.data).toEqual({ total: 3, label: 'sum' });
  });

  it('throws when the tool returns data violating its resultSchema', async () => {
    const pipeline = makePipeline();

    await expect(pipeline.execute(new DriftingTool(), {})).rejects.toThrow(
      /Tool 'drifting' result violates its resultSchema/,
    );
  });

  it('does not validate error envelopes', async () => {
    const pipeline = makePipeline();

    const envelope = await pipeline.execute(new ErroringTool(), {});

    expect(envelope.error).toBe('boom');
    expect(envelope.data).toEqual({ malformed: true });
  });

  it('validates envelopes substituted by interceptors (replay short-circuit path)', async () => {
    const pipeline = makePipeline();
    (pipeline as unknown as { interceptors: unknown[] }).interceptors = [
      { intercept: async () => Promise.resolve({ data: { total: 'not-a-number' } }) },
    ];

    await expect(pipeline.execute(new DriftingTool(), {})).rejects.toThrow(
      /Tool 'drifting' result violates its resultSchema/,
    );
  });

  it('accepts valid envelopes substituted by interceptors', async () => {
    const pipeline = makePipeline();
    (pipeline as unknown as { interceptors: unknown[] }).interceptors = [
      { intercept: async () => Promise.resolve({ data: { total: 42 } }) },
    ];

    const envelope = await pipeline.execute(new DriftingTool(), {});

    expect(envelope.data).toEqual({ total: 42 });
  });
});
