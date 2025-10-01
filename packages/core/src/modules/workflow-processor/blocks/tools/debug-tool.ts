import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { MockService } from '../services/mock.service';

const DebugInputSchema = z.object({
  value: z.any().optional(),
});

const DebugConfigSchema = z.object({
  value: z.any().optional(),
});

type DebugInput = z.infer<typeof DebugInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Debug tool for logging and inspecting values.',
  },
  inputSchema: DebugInputSchema,
  configSchema: DebugConfigSchema,
})
export class Debug extends Tool {
  protected readonly logger = new Logger(Debug.name);

  constructor(private readonly mockService: MockService) {
    super();
  }

  async execute(ctx: ExecutionContext<DebugInput>): Promise<HandlerCallResult> {
    return this.mockService.debug(ctx);
  }
}
