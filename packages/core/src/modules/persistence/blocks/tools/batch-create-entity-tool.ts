import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from 'src/modules/workflow-processor';
import { CreateEntityService } from '../services/create-entity.service';

const BatchCreateEntityInputSchema = z.object({
  entity: z.string(),
  items: z.array(z.any()),
});

const BatchCreateEntityConfigSchema = z.object({
  entity: z.string(),
  items: z.array(z.any()),
});

type BatchCreateEntityInput = z.infer<typeof BatchCreateEntityInputSchema>;

@Block({
  config: {
    description: 'Batch create entities.',
  },
  properties: BatchCreateEntityInputSchema,
  configSchema: BatchCreateEntityConfigSchema,
})
export class BatchCreateEntity extends Tool {
  protected readonly logger = new Logger(BatchCreateEntity.name);

  // constructor(private readonly createEntityService: CreateEntityService) {
  //   super();
  // }

  async execute(
    ctx: ExecutionContext<BatchCreateEntityInput>,
  ): Promise<HandlerCallResult> {
    throw 'needs implementation'
    // return this.createEntityService.createEntity(ctx);
  }
}
