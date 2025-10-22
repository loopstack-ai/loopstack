import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/shared';
import { DynamicRepositoryService } from '../../persistence';

@Injectable()
export class SqlQueryService {
  private readonly logger = new Logger(SqlQueryService.name);

  constructor(private dynamicRepositoryService: DynamicRepositoryService) {}

  async executeRawQuery(
    entityName: string,
    query: string,
    parameters?: any[],
    workflow?: WorkflowEntity,
  ): Promise<{ success: boolean; data: any }> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(
      `Executing sql query using repository for ${entityName}`,
    );

    const repository = this.dynamicRepositoryService.getRepository(entityName);
    const result = await repository.query(query, parameters ?? []);

    return {
      success: true,
      data: result,
    };
  }
}