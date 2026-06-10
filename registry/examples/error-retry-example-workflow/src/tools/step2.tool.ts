import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export type Step2ToolResult = string;

@Tool({
  name: 'step2',
  description: 'A tool that fails when shouldFail is true.',
})
export class Step2Tool extends BaseTool<{ shouldFail: boolean }, object, Step2ToolResult> {
  protected async handle(args: { shouldFail: boolean }, _ctx: RunContext): Promise<ToolResult<Step2ToolResult>> {
    if (args.shouldFail) {
      throw new Error('Simulated external service error');
    }

    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
