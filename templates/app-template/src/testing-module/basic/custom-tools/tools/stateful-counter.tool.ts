import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Tool } from '@loopstack/core';
import { Scope } from '@nestjs/common';
import { Expose } from 'class-transformer';

@BlockConfig({
  config: {
    description: 'Counter tool as singleton.',
  },
  scope: Scope.DEFAULT, // default singleton scope.
                        // BE CAREFUL: data becomes accessible cross-automation runs and potentially leak information.
                        // that's why all Blocks in Loopstack are transient by default.
})
export class StatefulCounterTool extends Tool {

  @Expose()
  count: number = 0;

  async execute(): Promise<HandlerCallResult> {
    this.count++;
    return {
      data: this.count,
    };
  }
}
