import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool, ToolInterface, ToolResult } from '@loopstack/shared';

const config = z
  .object({
    message: z.string().optional(),
  })
  .strict()
  .optional();

const schema = z
  .object({
    message: z.string().optional(),
  })
  .strict()
  .optional();

@Injectable()
@Tool({
  name: 'debug',
  description: 'Create a debug message',
  config,
  schema,
})
export class DebugService implements ToolInterface {
  private readonly logger = new Logger(DebugService.name);

  async apply(props: z.infer<typeof schema>): Promise<ToolResult> {
    this.logger.log(props?.message ?? 'no message');
  }
}
