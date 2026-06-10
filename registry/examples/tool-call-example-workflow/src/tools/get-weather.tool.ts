import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

export type GetWeatherResult = string;

@Tool({
  name: 'get_weather',
  description: 'Retrieve weather information.',
  schema: z.object({
    location: z.string(),
  }),
})
export class GetWeather extends BaseTool<{ location: string }, object, GetWeatherResult> {
  protected async handle(_args: unknown, _ctx: RunContext): Promise<ToolResult<GetWeatherResult>> {
    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
