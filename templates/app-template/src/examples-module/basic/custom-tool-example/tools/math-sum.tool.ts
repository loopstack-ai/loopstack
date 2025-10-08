import { Block, TemplateExpression, HandlerCallResult } from '@loopstack/shared';
import { z } from 'zod';
import { Tool } from '@loopstack/core';

@Block({
  config: {
    description: 'Debug tool for logging and inspecting values.',
  },

  // argument schema
  properties: z.object({
    a: z.number(),
    b: z.number()
  }),

  // schema to validate argument configuration which allows template expressions
  configSchema: z.object({
    a: z.union([
      TemplateExpression,
      z.number(),
    ]),
    b: z.union([
      TemplateExpression,
      z.number(),
    ]),
  }),
})
export class MathSumTool extends Tool {
  async execute(): Promise<HandlerCallResult> {

    const sum = this.args.a + this.args.b;

    return {
      success: true,
      data: sum
    };
  }
}
