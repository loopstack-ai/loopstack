import { Injectable, Logger } from '@nestjs/common';
import { HandlerCallResult, ExecutionContext } from '@loopstack/shared';
import { DynamicRepositoryService } from '../../../persistence';

@Injectable()
export class CreateEntityService {
  private readonly logger = new Logger(CreateEntityService.name);

  constructor(
    private readonly dynamicRepositoryService: DynamicRepositoryService,
  ) {}

  async createEntity(
    ctx: ExecutionContext<{
      entity: string;
      data?: any;
    }>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(`Creating entity ${ctx.args.entity}`);

    const repository = this.dynamicRepositoryService.getRepository(
      ctx.args.entity,
    );

    const entity = repository.create(ctx.args.data || {});
    const savedEntity = await repository.save(entity);

    return {
      success: true,
      data: savedEntity,
    };
  }
}
