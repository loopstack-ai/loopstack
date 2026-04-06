import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'Counter tool.',
  },
})
export class CounterTool extends BaseTool {
  count: number = 0;

  async call(_args?: object): Promise<ToolResult<number>> {
    this.count++;
    return { data: this.count };
  }
}
