import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/shared';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';
import { DynamicRepositoryService } from '../../persistence';

@Injectable()
export class EntityCreationService {
  private readonly logger = new Logger(EntityCreationService.name);

  constructor(private dynamicRepositoryService: DynamicRepositoryService) {}

  async createEntities(
    entityName: string,
    data: ObjectLiteral | ObjectLiteral[],
    workflow?: WorkflowEntity,
  ): Promise<{ data: ObjectLiteral | ObjectLiteral[] }> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(`Creating entity ${entityName}`);

    const repository = this.dynamicRepositoryService.getRepository(entityName);
    const items = Array.isArray(data) ? data : [data];
    const entities: ObjectLiteral[] = [];

    for (const dto of items) {
      entities.push(repository.create(dto));
    }

    await repository.save(entities);

    return {
      data: Array.isArray(data) ? entities : entities[0],
    };
  }
}