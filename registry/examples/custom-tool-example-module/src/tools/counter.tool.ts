import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export type CounterToolResult = number;

@Tool({
  name: 'counter',
  description: 'Counter tool.',
})
export class CounterTool extends BaseTool<object, object, CounterToolResult> {
  count: number = 0;

  protected async handle(_args: object | undefined, _ctx: RunContext): Promise<ToolResult<CounterToolResult>> {
    this.count++;
    return Promise.resolve({ data: this.count });
  }
}
