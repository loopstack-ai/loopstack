import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../workflow-processor';
import { MockService } from '../services/mock.service';

const DebugInputSchema = z.object({
  value: z.any().optional(),
});

const DebugConfigSchema = z.object({
  value: z.any().optional(),
});

type DebugInput = z.infer<typeof DebugInputSchema>;

@BlockConfig({
  config: {
    description: 'Debug tool for logging and inspecting values.',
  },
  properties: DebugInputSchema,
  configSchema: DebugConfigSchema,
})
export class Debug extends Tool<DebugInput> {
  protected readonly logger = new Logger(Debug.name);

  constructor(private readonly mockService: MockService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    return this.mockService.createMock({ input: this.args.value });
  }
}
