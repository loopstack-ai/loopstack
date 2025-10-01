import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from 'src/modules/workflow-processor';
import { CreateEntityService } from '../services/create-entity.service';

const CreateEntityInputSchema = z.object({
  entity: z.string(),
  data: z.any().optional(),
  items: z.array(z.any()).optional(),
});

const CreateEntityConfigSchema = z.object({
  entity: z.string(),
  data: z.any().optional(),
  items: z.array(z.any()).optional(),
});

type CreateEntityInput = z.infer<typeof CreateEntityInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Create an entity.',
  },
  inputSchema: CreateEntityInputSchema,
  configSchema: CreateEntityConfigSchema,
})
export class CreateEntity extends Tool {
  protected readonly logger = new Logger(CreateEntity.name);

  constructor(private readonly createEntityService: CreateEntityService) {
    super();
  }

  async execute(
    ctx: ExecutionContext<CreateEntityInput>,
  ): Promise<HandlerCallResult> {
    return this.createEntityService.createEntity(ctx);
  }
}
