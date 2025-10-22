import { BlockConfig, HandlerCallResult } from '@loopstack/shared';
import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { Tool } from '../../workflow-processor';
import { MockService } from '../services/mock.service';

const CreateMockInputSchema = z
  .object({
    input: z.any().optional(),
    output: z.any().optional(),
    error: z.string().optional(),
  })
  .strict();

type CreateMockInput = z.infer<typeof CreateMockInputSchema>;

const CreateMockConfigSchema = z
  .object({
    input: z.any().optional(),
    output: z.any().optional(),
    error: z.string().optional(),
  })
  .strict();

@BlockConfig({
  config: {
    description: 'Create a mock response for debugging and testing.',
  },
  properties: CreateMockInputSchema,
  configSchema: CreateMockConfigSchema,
  documentationFile: __dirname + '/create-mock-tool.md',
})
export class CreateMock extends Tool {
  protected readonly logger = new Logger(CreateMock.name);

  constructor(protected mockService: MockService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    return this.mockService.createMock(this.args);
  }
}
