import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  config: {
    description: 'Counter tool.',
  },
})
export class CounterTool extends BaseTool {
  count: number = 0;

  async run(): Promise<ToolResult> {
    this.count++;
    return Promise.resolve({
      data: this.count,
    });
  }
}
