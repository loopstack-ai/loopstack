import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description:
      'Perform an action that may fail at runtime. ' +
      'Pass shouldFail: true to simulate a runtime error, or false to succeed.',
  },
  schema: z.object({
    shouldFail: z.boolean().describe('Whether the tool should simulate a runtime failure.'),
  }),
})
export class RuntimeErrorTool extends BaseTool {
  call(args: { shouldFail: boolean }): Promise<ToolResult> {
    if (args.shouldFail) {
      throw new Error('Simulated runtime error: external service unavailable.');
    }

    return Promise.resolve({
      data: 'Action completed successfully.',
    });
  }
}
