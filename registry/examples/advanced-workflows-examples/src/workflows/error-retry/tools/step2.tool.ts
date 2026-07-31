import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type Step2ToolResult = string;

export const Step2ToolResultSchema = z.string();

@Tool({
  name: 'step2',
  description: 'A tool that fails when shouldFail is true.',
  resultSchema: Step2ToolResultSchema,
})
export class Step2Tool extends BaseTool<{ shouldFail: boolean }, object, Step2ToolResult> {
  protected async handle(args: { shouldFail: boolean }): Promise<ToolEnvelope<Step2ToolResult>> {
    if (args.shouldFail) {
      throw new Error('Simulated external service error');
    }

    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
