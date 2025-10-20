import { Logger } from '@nestjs/common';
import {
  ContextImportInterface,
  HandlerCallResult,
  TransitionMetadataInterface,
  TemplateExpression,
  BlockConfig,
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
    where: z.union([WhereCondition, TemplateExpression]),
    orderBy: z
      .union([
        z.record(z.string(), z.union([z.literal('ASC'), z.literal('DESC')])),
        TemplateExpression,
      ])
      .optional(),
    getMany: z.union([z.boolean(), TemplateExpression]).optional(),
    take: z.union([z.number(), TemplateExpression]).optional(),
    skip: z.union([z.number(), TemplateExpression]).optional(),
    isDependency: z.union([z.boolean(), TemplateExpression]).optional(),
    isGlobal: z.union([z.boolean(), TemplateExpression]).optional(),
    strictMode: z.union([z.boolean(), TemplateExpression]).optional(),
  })
  .strict();

@BlockConfig({
  config: {
    description: 'Load documents from database based on query conditions.',
  },
  properties: LoadDocumentInputSchema,
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
    workflowIndex: string,
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
        ltWorkflowIndex: workflowIndex,
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
      workflow.prevData?.imports?.[transitionData.id!];

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
  async execute(): Promise<HandlerCallResult> {
    if (!this.state.id) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(`Load document ${this.state.transition?.id}`);

    // load and filter entities based on options from database
    const result = await this.getDocumentsByQuery(
      this.args,
      this.ctx.pipelineId,
      this.ctx.workspaceId,
      this.ctx.index,
    );

    // todo!
    // update workflow dependencies
    // if (result && this.args.isDependency) {
    //   this.trackDependencies(this.state.id, toolProcessor.ctx.state.transition!, result);
    // }

    return {
      success: true,
      // workflow: toolProcessor.ctx.state.workflow,
      data: result,
    };
  }
}
