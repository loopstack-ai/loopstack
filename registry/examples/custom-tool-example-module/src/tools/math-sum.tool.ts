import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { MathService } from '../services/math.service';

export type MathSumArgs = {
  a: number;
  b: number;
};

@Injectable()
@Tool({
  config: {
    description: 'Math tool calculating the sum of two arguments by using an injected service.',
  },
})
export class MathSumTool implements ToolInterface {
  @Inject()
  private mathService: MathService;

  @Input({
    schema: z
      .object({
        a: z.number(),
        b: z.number(),
      })
      .strict(),
  })
  args: MathSumArgs;

  async execute(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return Promise.resolve({
      data: sum,
    });
  }
}
