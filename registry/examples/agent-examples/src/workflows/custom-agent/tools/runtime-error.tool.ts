import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export type RuntimeErrorToolResult = string;

@Tool({
  name: 'runtime_error',
  description:
    'Perform an action that may fail at runtime. ' +
    'Pass shouldFail: true to simulate a runtime error, or false to succeed.',
  schema: z.object({
    shouldFail: z.boolean().describe('Whether the tool should simulate a runtime failure.'),
  }),
})
export class RuntimeErrorTool extends BaseTool<{ shouldFail: boolean }, object, RuntimeErrorToolResult> {
  protected async handle(
    args: { shouldFail: boolean },
    _ctx: RunContext,
  ): Promise<ToolEnvelope<RuntimeErrorToolResult>> {
    if (args.shouldFail) {
      throw new Error('Simulated runtime error: external service unavailable.');
    }

    return Promise.resolve({
      data: 'Action completed successfully.',
    });
  }
}
