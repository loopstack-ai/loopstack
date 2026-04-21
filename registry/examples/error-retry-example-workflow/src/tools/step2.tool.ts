import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'A tool that fails when shouldFail is true.',
  },
})
export class Step2Tool extends BaseTool {
  // eslint-disable-next-line @typescript-eslint/require-await
  async call(args: { shouldFail: boolean }): Promise<ToolResult> {
    if (args.shouldFail) {
      throw new Error('Simulated external service error');
    }

    return {
      type: 'text',
      data: 'Step completed successfully.',
    };
  }
}
