import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'Greet a person by name. Requires a name argument. ' + 'Returns a greeting message.',
  },
  schema: z
    .object({
      name: z.string().describe('The name of the person to greet.'),
    })
    .strict(),
})
export class StrictSchemaTool extends BaseTool {
  call(args: { name: string }): ToolResult {
    return {
      data: `Hello, ${args.name}! Nice to meet you.`,
    };
  }
}
