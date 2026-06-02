import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { GREETER_CONFIG } from './greeter.constants.js';
import type { GreeterConfig } from './greeter.constants.js';

export const GreeterArgsSchema = z.object({
  name: z.string().describe('Name to greet'),
});

type GreeterArgs = z.infer<typeof GreeterArgsSchema>;

export interface GreetResult {
  message: string;
  language: string;
  greeting: string;
}

@Tool({
  name: 'greeter',
  schema: GreeterArgsSchema,
})
export class GreeterTool extends BaseTool<GreeterArgs, object, GreetResult> {
  @Inject(GREETER_CONFIG) private readonly config: GreeterConfig;

  protected async handle(args: GreeterArgs, _ctx: LoopstackContext): Promise<ToolResult<GreetResult>> {
    const language = this.config.language ?? 'en';
    const greeting = this.config.greeting ?? 'Hello';

    return {
      data: {
        message: `${greeting}, ${args.name}! [language=${language}]`,
        language,
        greeting,
      },
    };
  }
}
