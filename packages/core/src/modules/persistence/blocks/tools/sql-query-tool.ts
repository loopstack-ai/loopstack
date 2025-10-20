// import { Block, HandlerCallResult } from '@loopstack/shared';
// import { Logger } from '@nestjs/common';
// import { z } from 'zod';
// import { DynamicRepositoryService } from '../../services';
// import { Tool } from 'src/modules/workflow-processor';
// import { BlockData } from '../../../workflow-processor/dtos/block-processor.dto';
//
// const SqlQueryInputSchema = z.object({
//   entity: z.string(),
//   query: z.string(),
//   parameters: z
//     .array(z.union([z.string(), z.number(), z.boolean()]))
//     .optional(),
// });
//
// const SqlQueryConfigSchema = z.object({
//   entity: z.string(),
//   query: z.string(),
//   parameters: z
//     .array(z.union([z.string(), z.number(), z.boolean()]))
//     .optional(),
// });
//
// type SqlQueryInput = z.infer<typeof SqlQueryInputSchema>;
//
// @Block({
//   config: {
//     description: 'Execute SQL queries against database entities.',
//   },
//   properties: SqlQueryInputSchema,
//   configSchema: SqlQueryConfigSchema,
// })
// export class SqlQuery extends Tool {
//   protected readonly logger = new Logger(SqlQuery.name);
//
//   constructor(
//     private readonly dynamicRepositoryService: DynamicRepositoryService,
//   ) {
//     super();
//   }
//
//   async execute(
//     args: SqlQueryInput,
//     data: BlockData,
//   ): Promise<HandlerCallResult> {
//     if (!data.state.workflow) {
//       throw new Error('Workflow is undefined');
//     }
//
//     this.logger.debug(
//       `Executing sql query using repository for ${args.entity}`,
//     );
//
//     const repository = this.dynamicRepositoryService.getRepository(
//       args.entity,
//     );
//
//     const result = await repository.query(
//       args.query,
//       args.parameters ?? [],
//     );
//
//     return {
//       success: true,
//       data: result,
//     };
//   }
// }
