import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { z } from 'zod';
import { Tool } from '@loopstack/core';
import { Injectable } from '@nestjs/common';

const propertiesSchema = z.object({
  location: z.string(),
});

const configSchema = z.object({
  location: z.string(),
});

@Injectable()
@BlockConfig({
  config: {
    description: 'Retrieve weather information.',
  },
  properties: propertiesSchema,
  configSchema: configSchema,
})
export class GetWeather extends Tool {
  async execute(): Promise<HandlerCallResult> {

    // Wait for 3 seconds for testing
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.'
    };
  }
}
