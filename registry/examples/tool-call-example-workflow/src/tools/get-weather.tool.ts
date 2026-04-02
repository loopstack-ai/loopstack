import { z } from 'zod';
import { BaseTool, Input, Tool, ToolResult } from '@loopstack/common';

@Tool({
  config: {
    description: 'Retrieve weather information.',
  },
})
export class GetWeather extends BaseTool {
  @Input({
    schema: z.object({
      location: z.string(),
    }),
  })
  async run(): Promise<ToolResult> {
    // Wait for 3 seconds for testing
    // await new Promise(resolve => setTimeout(resolve, 3000));

    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
