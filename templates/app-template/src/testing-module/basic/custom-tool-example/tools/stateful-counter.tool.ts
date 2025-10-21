import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Tool } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

@Injectable() // service is stateful / singleton by default
@BlockConfig({
  config: {
    description: 'Counter tool as singleton.',
  },
})
export class StatefulCounterTool extends Tool {

  count: number = 0;

  async execute(): Promise<HandlerCallResult> {
    this.count++;
    return {
      success: true,
      data: this.count,
    };
  }
}
