import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type Step1ToolResult = string;

export const Step1ToolResultSchema = z.string();

@Tool({
  name: 'step1',
  description: 'A tool that always succeeds.',
  resultSchema: Step1ToolResultSchema,
})
export class Step1Tool extends BaseTool<object, object, Step1ToolResult> {
  protected async handle(): Promise<ToolEnvelope<Step1ToolResult>> {
    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
