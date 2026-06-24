import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

export type Step1ToolResult = string;

@Tool({
  name: 'step1',
  description: 'A tool that always succeeds.',
})
export class Step1Tool extends BaseTool<object, object, Step1ToolResult> {
  protected async handle(): Promise<ToolEnvelope<Step1ToolResult>> {
    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
