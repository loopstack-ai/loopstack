import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
} from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DynamicRepositoryService } from '../services';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';

const config = z
  .object({
    entity: z.string(),
    data: z.any().optional(),
    items: z.any().optional(),
  })
  .strict();

const schema = z
  .object({
    entity: z.string(),
    data: z.any().optional(),
    items: z.array(z.any()).optional(),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class CreateEntityHandler implements HandlerInterface {
  private readonly logger = new Logger(CreateEntityHandler.name);

  constructor(private dynamicRepositoryService: DynamicRepositoryService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(`Creating entity ${props.entity}`);

    const repository = this.dynamicRepositoryService.getRepository(
      props.entity,
    );

    const items = props.items ?? [props.data];
    const entities: ObjectLiteral[] = [];
    for (const dto of items) {
      // todo get the entity class and apply transformer + validator
      entities.push(repository.create(dto));
    }

    await repository.save(entities);

    return {
      success: true,
      data: props.items ? entities : entities[0],
    };
  }
}
