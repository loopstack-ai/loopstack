import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { MathService } from '../services/math.service';

const MathSumSchema = z
  .object({
    a: z.number(),
    b: z.number(),
  })
  .strict();

type MathSumArgs = z.infer<typeof MathSumSchema>;

export type MathSumToolResult = number;

@Tool({
  name: 'math_sum',
  description: 'Math tool calculating the sum of two arguments by using an injected service.',
  schema: MathSumSchema,
})
export class MathSumTool extends BaseTool<MathSumArgs, object, MathSumToolResult> {
  constructor(private readonly mathService: MathService) {
    super();
  }

  protected async handle(args: MathSumArgs): Promise<ToolEnvelope<MathSumToolResult>> {
    const sum = this.mathService.sum(args.a, args.b);
    return Promise.resolve({ data: sum });
  }
}
