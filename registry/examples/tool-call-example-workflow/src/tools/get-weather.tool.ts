import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Tool, ToolInterface, ToolResult, WithArguments } from '@loopstack/common';

@Injectable()
@Tool({
  config: {
    description: 'Retrieve weather information.',
  },
})
@WithArguments(
  z.object({
    location: z.string(),
  }),
)
export class GetWeather implements ToolInterface {
  async execute(): Promise<ToolResult> {
    // Wait for 3 seconds for testing
    // await new Promise(resolve => setTimeout(resolve, 3000));

    return await Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
