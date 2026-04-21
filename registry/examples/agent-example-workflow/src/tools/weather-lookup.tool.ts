import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'Look up the current weather for a given city. Returns a simulated forecast.',
  },
  schema: z.object({
    city: z.string().describe('The city name to look up weather for.'),
  }),
})
export class WeatherLookupTool extends BaseTool {
  call(args: { city: string }): Promise<ToolResult> {
    // Simulated weather data for demonstration purposes
    const forecasts: Record<string, string> = {
      london: '14°C, cloudy with light rain',
      tokyo: '22°C, sunny with clear skies',
      'new york': '18°C, partly cloudy',
    };

    const key = args.city.toLowerCase();
    const weather = forecasts[key] ?? `21°C, pleasant conditions`;

    return Promise.resolve({
      data: `Weather in ${args.city}: ${weather}`,
    });
  }
}
