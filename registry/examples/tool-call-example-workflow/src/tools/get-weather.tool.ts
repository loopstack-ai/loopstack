import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'Retrieve weather information.',
  },
  schema: z.object({
    location: z.string(),
  }),
})
export class GetWeather extends BaseTool {
  async call(_args: unknown): Promise<ToolResult> {
    // Wait for 3 seconds for testing
    // await new Promise(resolve => setTimeout(resolve, 3000));

    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
