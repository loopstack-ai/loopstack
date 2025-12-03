import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEntity } from '@loopstack/common';
import { DynamicRepositoryService } from '../../workflow-processor';

@Injectable()
export class SqlQueryService {
  private readonly logger = new Logger(SqlQueryService.name);

  constructor(private dynamicRepositoryService: DynamicRepositoryService) {}

  async executeRawQuery(
    entityName: string,
    query: string,
    parameters?: any[],
    workflow?: WorkflowEntity,
  ): Promise<{ data: any }> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(`Executing sql query using repository for ${entityName}`);

    const repository = this.dynamicRepositoryService.getRepository(entityName);
    const result = await repository.query(query, parameters ?? []);

    return {
      data: result,
    };
  }
}
