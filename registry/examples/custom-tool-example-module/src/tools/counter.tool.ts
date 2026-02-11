import { Tool, ToolInterface, ToolResult } from '@loopstack/common';

@Tool({
  config: {
    description: 'Counter tool.',
  },
})
export class CounterTool implements ToolInterface {
  count: number = 0;

  async execute(): Promise<ToolResult> {
    this.count++;
    return Promise.resolve({
      data: this.count,
    });
  }
}
