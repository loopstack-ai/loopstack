import { Injectable, Logger } from '@nestjs/common';
import { HandlerCallResult, ExecutionContext } from '@loopstack/shared';
import { DynamicRepositoryService } from '../..';

@Injectable()
export class CreateEntityService {
  private readonly logger = new Logger(CreateEntityService.name);

  constructor(
    private readonly dynamicRepositoryService: DynamicRepositoryService,
  ) {}

  async createEntity(
    args: {
      entity: string;
      data?: any;
      items?: any[];
    },
    ctx: ExecutionContext,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(`Creating entity ${args.entity}`);

    const repository = this.dynamicRepositoryService.getRepository(
      args.entity,
    ) as any;

    const items = args.items ?? [args.data];
    console.log(items);
    const entities: any[] = [];
    for (const dto of items) {
      // todo get the entity class and apply transformer + validator
      entities.push(repository.create(dto));
    }

    await repository.save(entities);

    return {
      success: true,
      data: args.items ? entities : entities[0],
    };
  }
}
