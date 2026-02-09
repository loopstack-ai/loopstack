import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';

@Injectable()
@Tool({
  config: {
    description: 'Retrieve weather information.',
  },
})
export class GetWeather implements ToolInterface {
  @Input({
    schema: z.object({
      location: z.string(),
    }),
  })
  async execute(): Promise<ToolResult> {
    // Wait for 3 seconds for testing
    // await new Promise(resolve => setTimeout(resolve, 3000));

    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
