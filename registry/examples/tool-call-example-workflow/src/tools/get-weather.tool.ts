import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { z } from 'zod';
import { ToolBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

@Injectable()
@BlockConfig({
  config: {
    description: 'Retrieve weather information.',
  },
})
@WithArguments(z.object({
  location: z.string(),
}))
export class GetWeather extends ToolBase {
  async execute(): Promise<ToolResult> {

    // Wait for 3 seconds for testing
    // await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.'
    };
  }
}
