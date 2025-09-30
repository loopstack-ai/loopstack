import { Logger } from '@nestjs/common';
import {
  ContextImportInterface,
  ExecutionContext,
  HandlerCallResult,
  TransitionMetadataInterface,
  ExpressionString,
  Block,
} from '@loopstack/shared';
import { z } from 'zod';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import {
  DocumentService,
  WhereCondition,
  WorkflowService,
} from '../../../persistence';
import { Tool } from '../../abstract';

const LoadDocumentInputSchema = z
  .object({
    where: WhereCondition,
    orderBy: z
      .record(z.string(), z.union([z.literal('ASC'), z.literal('DESC')]))
      .default({
        workflow_index: 'DESC',
      }),
    getMany: z.boolean().optional().default(false),
    take: z.number().default(100),
    skip: z.number().default(0),

    isDependency: z.boolean().default(true),
    isGlobal: z.boolean().default(false),
    strictMode: z.boolean().default(true),
  })
  .strict();

const LoadDocumentConfigSchema = z
  .object({
    where: z.union([WhereCondition, ExpressionString]),
    orderBy: z
      .union([
        z.record(z.string(), z.union([z.literal('ASC'), z.literal('DESC')])),
        ExpressionString,
      ])
      .optional(),
    getMany: z.union([z.boolean(), ExpressionString]).optional(),
    take: z.union([z.number(), ExpressionString]).optional(),
    skip: z.union([z.number(), ExpressionString]).optional(),
    isDependency: z.union([z.boolean(), ExpressionString]).optional(),
    isGlobal: z.union([z.boolean(), ExpressionString]).optional(),
    strictMode: z.union([z.boolean(), ExpressionString]).optional(),
  })
  .strict();

@Block({
  config: {
    type: 'tool',
    description: 'Load documents from database based on query conditions.',
  },
  inputSchema: LoadDocumentInputSchema,
  configSchema: LoadDocumentConfigSchema,
})
export class LoadDocument extends Tool {
  private readonly logger = new Logger(LoadDocument.name);

  constructor(
    private documentService: DocumentService,
    private workflowService: WorkflowService,
  ) {
    super();
  }

  /**
   * retrieve from database
   */
  async getDocumentsByQuery(
    props: z.infer<typeof LoadDocumentInputSchema>,
    pipelineId: string,
    workspaceId: string,
    workflow: WorkflowEntity,
  ): Promise<DocumentEntity[] | DocumentEntity | null> {
    const query = this.documentService.createDocumentsQuery(
      pipelineId,
      workspaceId,
      props.where,
      {
        take: props.getMany ? props.take : undefined,
        skip: props.getMany ? props.skip : undefined,
        orderBy: props.orderBy,
        isValidOnly: true,
        isGlobal: !!props.isGlobal,
        ltWorkflowIndex: workflow.index,
      },
    );

    this.logger.debug(query.getQuery());
    this.logger.debug(query.getParameters());

    const result = props.getMany ? await query.getMany() : await query.getOne();

    if (!result && props.strictMode) {
      throw new Error(`Document(s) not found.`);
    }

    return result;
  }

  /**
   * updates the workflow's dependencies hash
   */
  updateWorkflowDependenciesHash(workflow: WorkflowEntity): void {
    const hash = this.workflowService.createDependenciesHash(workflow);
    workflow.hashRecord = {
      ...(workflow.hashRecord ?? {}),
      dependencies: hash,
    };
  }

  trackDependencies(
    workflow: WorkflowEntity,
    transitionData: TransitionMetadataInterface,
    result: DocumentEntity[] | DocumentEntity,
  ) {
    const prevImport: ContextImportInterface | undefined =
      workflow.prevData?.imports?.[transitionData.transition!];

    if (!workflow.dependencies) {
      workflow.dependencies = [];
    }

    if (prevImport) {
      workflow.dependencies = workflow.dependencies.filter(
        (dep) => !prevImport?.ids.includes(dep.id),
      );
    }

    const existingDependencyIds = workflow.dependencies.map((dep) => dep.id);
    const dependencyList = Array.isArray(result) ? result : [result];
    const newDependencies = dependencyList.filter(
      (entity) => !existingDependencyIds.includes(entity.id),
    );

    if (newDependencies.length) {
      workflow.dependencies.push(...newDependencies);
      this.updateWorkflowDependenciesHash(workflow);
    }
  }

  /**
   * import documents based on the defined options
   * tracks differences to previously imported documents
   * and updates workflow dependencies, if applicable
   */
  async execute(
    ctx: ExecutionContext<z.infer<typeof LoadDocumentInputSchema>>,
  ): Promise<HandlerCallResult> {
    if (!ctx.workflow) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(`Load document ${ctx.transitionData?.transition}`);

    // load and filter entities based on options from database
    const result = await this.getDocumentsByQuery(
      ctx.args,
      ctx.context.pipelineId,
      ctx.context.workspaceId,
      ctx.workflow,
    );

    // update workflow dependencies
    if (result && ctx.args.isDependency) {
      this.trackDependencies(ctx.workflow, ctx.transitionData, result);
    }

    return {
      success: true,
      workflow: ctx.workflow,
      data: result,
    };
  }
}
