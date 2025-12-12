import { BlockConfig, ToolResult } from '@loopstack/common';
import { ToolBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

@Injectable()
@BlockConfig({
  config: {
    description: 'Counter tool.',
  },
})
export class CounterTool extends ToolBase {
  count: number = 0;

  async execute(): Promise<ToolResult> {
    this.count++;
    return {
      data: this.count,
    };
  }
}
