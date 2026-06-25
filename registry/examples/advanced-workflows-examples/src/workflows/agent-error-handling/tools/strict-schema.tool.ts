import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type StrictSchemaToolResult = string;

@Tool({
  name: 'strict_schema',
  description: 'Greet a person by name. Requires a name argument. ' + 'Returns a greeting message.',
  schema: z
    .object({
      name: z.string().describe('The name of the person to greet.'),
    })
    .strict(),
})
export class StrictSchemaTool extends BaseTool<{ name: string }, object, StrictSchemaToolResult> {
  protected async handle(args: { name: string }): Promise<ToolEnvelope<StrictSchemaToolResult>> {
    return Promise.resolve({
      data: `Hello, ${args.name}! Nice to meet you.`,
    });
  }
}
