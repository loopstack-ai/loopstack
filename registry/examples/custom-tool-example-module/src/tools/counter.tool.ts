import { Shared, Tool, ToolInterface, ToolResult } from '@loopstack/common';

@Tool({
  config: {
    description: 'Counter tool.',
  },
})
export class CounterTool implements ToolInterface {
  @Shared() count: number = 0;

  async execute(): Promise<ToolResult> {
    this.count++;
    return Promise.resolve({
      data: this.count,
    });
  }
}
