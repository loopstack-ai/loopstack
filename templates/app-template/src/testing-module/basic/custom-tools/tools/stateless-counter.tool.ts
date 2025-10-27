import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Tool } from '@loopstack/core';
import { Expose } from 'class-transformer';

@BlockConfig({
  config: {
    description: 'Counter tool with transient scope.',
  },
})
export class StatelessCounterTool extends Tool {

  @Expose()
  count: number = 0;

  async execute(): Promise<HandlerCallResult> {
    this.count++; // this counter will not work since the service is transient
    return {
      data: this.count,
    };
  }
}
