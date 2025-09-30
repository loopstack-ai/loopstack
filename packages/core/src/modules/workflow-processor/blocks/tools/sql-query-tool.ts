import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { DynamicRepositoryService } from '../../../persistence/services';

const SqlQueryInputSchema = z.object({
  entity: z.string(),
  query: z.string(),
  parameters: z
    .array(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

const SqlQueryConfigSchema = z.object({
  entity: z.string(),
  query: z.string(),
  parameters: z
    .array(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

type SqlQueryInput = z.infer<typeof SqlQueryInputSchema>;

@Block({
  config: {
    type: 'tool',
    description: 'Execute SQL queries against database entities.',
  },
  inputSchema: SqlQueryInputSchema,
  configSchema: SqlQueryConfigSchema,
})
export class SqlQuery extends Tool {
  protected readonly logger = new Logger(SqlQuery.name);

  constructor(
    private readonly dynamicRepositoryService: DynamicRepositoryService,
  ) {
    super();
  }

  async execute(
    ctx: ExecutionContext<SqlQueryInput>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(
      `Executing sql query using repository for ${ctx.args.entity}`,
    );

    const repository = this.dynamicRepositoryService.getRepository(
      ctx.args.entity,
    );

    const result = await repository.query(
      ctx.args.query,
      ctx.args.parameters ?? [],
    );

    return {
      success: true,
      data: result,
    };
  }
}
