import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'A tool that takes a configurable amount of time to complete.',
  },
})
export class SlowTool extends BaseTool {
  async call(args: { delayMs: number }): Promise<ToolResult> {
    await new Promise((resolve) => setTimeout(resolve, args.delayMs));
    return {
      type: 'text',
      data: 'Slow tool completed.',
    };
  }
}
