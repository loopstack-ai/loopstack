import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type SlowToolResult = string;

export const SlowToolResultSchema = z.string();

@Tool({
  name: 'slow',
  description: 'A tool that takes a configurable amount of time to complete.',
  resultSchema: SlowToolResultSchema,
})
export class SlowTool extends BaseTool<{ delayMs: number }, object, SlowToolResult> {
  protected async handle(args: { delayMs: number }): Promise<ToolEnvelope<SlowToolResult>> {
    await new Promise((resolve) => setTimeout(resolve, args.delayMs));
    return {
      type: 'text',
      data: 'Slow tool completed.',
    };
  }
}
