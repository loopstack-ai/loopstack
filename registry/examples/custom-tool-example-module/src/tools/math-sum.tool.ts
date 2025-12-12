import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { ToolBase } from '@loopstack/core';
import { MathService } from '../services/math.service';
import { Inject, Injectable } from '@nestjs/common';

const propertiesSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

export type MathSumArgs = z.infer<typeof propertiesSchema>;

@Injectable()
@BlockConfig({
  config: {
    description:
      'Math tool calculating the sum of two arguments by using an injected service.',
  },
})
@WithArguments(propertiesSchema)
export class MathSumTool extends ToolBase<MathSumArgs> {
  @Inject()
  private mathService: MathService;

  async execute(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return {
      data: sum,
    };
  }
}
