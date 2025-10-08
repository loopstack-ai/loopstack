import { CreateChatMessage, Workflow } from '@loopstack/core';
import { Block, Output } from '@loopstack/shared';
import { z } from 'zod';
import { MathSumTool } from '../tools/math-sum.tool';

@Block({
  imports: [MathSumTool, CreateChatMessage],
  config: {
    title: 'Example 3: Custom Tool',
  },
  properties: z.object({
    a: z.number().default(1),
    b: z.number().default(2),
  }),
  configFile: __dirname + '/custom-tool-example.workflow.yaml',
})
export class CustomToolExampleWorkflow extends Workflow  {
  @Output()
  get alternativeCalculation() {
    return this.args.a + this.args.b;
  }
}