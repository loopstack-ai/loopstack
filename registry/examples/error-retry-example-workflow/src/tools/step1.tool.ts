import { BaseTool, Tool, ToolResult } from '@loopstack/common';

export type Step1ToolResult = string;

@Tool({
  name: 'step1',
  uiConfig: {
    description: 'A tool that always succeeds.',
  },
})
export class Step1Tool extends BaseTool<object, object, Step1ToolResult> {
  protected async handle(): Promise<ToolResult<Step1ToolResult>> {
    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
