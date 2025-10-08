import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
  TemplateExpression,
} from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DynamicRepositoryService } from '../services';

const config = z
  .object({
    entity: z.string(),
    query: z.string(),
    parameters: z.union([TemplateExpression, z.array(z.any())]).optional(),
  })
  .strict();

const schema = z
  .object({
    entity: z.string(),
    query: z.string(),
    parameters: z.array(z.any()).optional(),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class SqlQueryHandler implements HandlerInterface {
  private readonly logger = new Logger(SqlQueryHandler.name);

  constructor(private dynamicRepositoryService: DynamicRepositoryService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(
      `Executing sql query using repository for ${props.entity}`,
    );

    const repository = this.dynamicRepositoryService.getRepository(
      props.entity,
    );

    const result = await repository.query(props.query, props.parameters ?? []);

    return {
      success: true,
      data: result,
    };
  }
}
