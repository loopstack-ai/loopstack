import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Tool } from '@loopstack/core';
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT }) // service is defined transient / non-singleton
@BlockConfig({
  config: {
    description: 'Counter tool with transient scope.',
  },
})
export class StatelessCounterTool extends Tool {

  count: number = 0;

  async execute(): Promise<HandlerCallResult> {
    this.count++; // this counter will not work since the service is transient
    return {
      success: true,
      data: this.count,
    };
  }
}
