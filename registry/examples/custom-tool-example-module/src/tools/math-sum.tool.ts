import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { MathService } from '../services/math.service';

const MathSumSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

type MathSumArgs = z.infer<typeof MathSumSchema>;

@Tool({
  uiConfig: {
    description: 'Math tool calculating the sum of two arguments by using an injected service.',
  },
  schema: MathSumSchema,
})
export class MathSumTool extends BaseTool {
  @Inject()
  private mathService: MathService;

  async call(args: MathSumArgs): Promise<ToolResult<number>> {
    const sum = this.mathService.sum(args.a, args.b);
    return { data: sum };
  }
}
