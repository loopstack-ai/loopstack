import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool, ToolInterface, ToolResult } from '@loopstack/shared';

const config = z
  .object({
    input: z.string().optional(),
    output: z.string().optional(),
  })
  .strict();

const schema = z
  .object({
    input: z.string().optional(),
    output: z.string().optional(),
  })
  .strict();

@Injectable()
@Tool({
  name: 'debug',
  description: 'Log a message',
  config,
  schema,
})
export class DebugService implements ToolInterface {
  private readonly logger = new Logger(DebugService.name);

  async apply(props: z.infer<typeof schema>): Promise<ToolResult> {

    const message = props?.input ?? 'no message'

    this.logger.debug(message);

    return {
      success: true,
      data: { content: props?.output }
    }
  }
}
