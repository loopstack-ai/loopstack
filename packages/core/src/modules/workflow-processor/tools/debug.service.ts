import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Tool,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';

@Injectable()
@Tool()
export class DebugService implements ToolInterface {
  private readonly logger = new Logger(DebugService.name);

  schema = z.object({
    message: z.string().optional(),
  }).optional();

  async apply(
    props: z.infer<typeof this.schema>,
  ): Promise<ToolResult> {
    this.logger.log(props?.message ?? 'no message');
    return {};
  }
}
