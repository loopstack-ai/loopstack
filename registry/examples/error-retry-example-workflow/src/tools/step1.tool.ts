import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'A tool that always succeeds.',
  },
})
export class Step1Tool extends BaseTool {
  // eslint-disable-next-line @typescript-eslint/require-await
  async call(): Promise<ToolResult> {
    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
