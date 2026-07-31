import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type CounterToolResult = number;

export const CounterToolResultSchema = z.number();

@Tool({
  name: 'counter',
  description: 'Counter tool.',
  resultSchema: CounterToolResultSchema,
})
export class CounterTool extends BaseTool<object, object, CounterToolResult> {
  count: number = 0;

  protected async handle(): Promise<ToolEnvelope<CounterToolResult>> {
    this.count++;
    return Promise.resolve({ data: this.count });
  }
}
