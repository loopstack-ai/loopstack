import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export type SlowOperationToolResult = string;

export const SlowOperationToolResultSchema = z.string();

/**
 * Takes `delayMs` to complete. The sleep listens to `ctx.signal`, which the framework aborts
 * when the calling transition times out — so the abandoned operation stops instead of running on.
 */
@Tool({
  name: 'slow_operation',
  description: 'Simulates an operation that takes a configurable amount of time to complete.',
  resultSchema: SlowOperationToolResultSchema,
  effects: 'none',
})
export class SlowOperationTool extends BaseTool<{ delayMs: number }, object, SlowOperationToolResult> {
  protected async handle(args: { delayMs: number }, ctx: RunContext): Promise<ToolEnvelope<SlowOperationToolResult>> {
    await sleep(args.delayMs, undefined, { signal: ctx.signal });
    return {
      type: 'text',
      data: 'Slow operation completed.',
    };
  }
}
