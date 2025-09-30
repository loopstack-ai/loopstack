import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { CreateEntityService } from '../services/create-entity.service';

const CreateEntityInputSchema = z.object({
  entity: z.string(),
  data: z.any(),
});

const CreateEntityConfigSchema = z.object({
  entity: z.string(),
  data: z.any(),
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
