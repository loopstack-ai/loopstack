import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export type SlowToolResult = string;

@Tool({
  name: 'slow',
  description: 'A tool that takes a configurable amount of time to complete.',
})
export class SlowTool extends BaseTool<{ delayMs: number }, object, SlowToolResult> {
  protected async handle(args: { delayMs: number }, _ctx: RunContext): Promise<ToolResult<SlowToolResult>> {
    await new Promise((resolve) => setTimeout(resolve, args.delayMs));
    return {
      type: 'text',
      data: 'Slow tool completed.',
    };
  }
}
