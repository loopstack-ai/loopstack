import { Logger } from '@nestjs/common';
import {
  ContextImportInterface,
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
  TransitionMetadataInterface,
  TemplateExpression,
} from '@loopstack/shared';
import { z } from 'zod';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import {
  DocumentService,
  WhereCondition,
  WorkflowService,
} from '../../persistence';

const config = z
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

const schema = z
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

@Handler({
  config,
  schema,
})
export class LoadDocumentHandler implements HandlerInterface {
  private readonly logger = new Logger(LoadDocumentHandler.name);

  constructor(
    private documentService: DocumentService,
    private workflowService: WorkflowService,
  ) {}

  /**
   * retrieve from database
   */
  async getDocumentsByQuery(
    props: z.infer<typeof schema>,
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
    // todo
    // const prevImport: ContextImportInterface | undefined =
    //   workflow.prevData?.imports?.[transitionData.id!];
    //
    // if (!workflow.dependencies) {
    //   workflow.dependencies = [];
    // }
    //
    // if (prevImport) {
    //   workflow.dependencies = workflow.dependencies.filter(
    //     (dep) => !prevImport?.ids.includes(dep.id),
    //   );
    // }
    //
    // const existingDependencyIds = workflow.dependencies.map((dep) => dep.id);
    // const dependencyList = Array.isArray(result) ? result : [result];
    // const newDependencies = dependencyList.filter(
    //   (entity) => !existingDependencyIds.includes(entity.id),
    // );
    //
    // if (newDependencies.length) {
    //   workflow.dependencies.push(...newDependencies);
    //   this.updateWorkflowDependenciesHash(workflow);
    // }
  }

  /**
   * import documents based on the defined options
   * tracks differences to previously imported documents
   * and updates workflow dependencies, if applicable
   */
  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(`Load document ${transitionData.id}`);

    // load and filter entities based on options from database
    const result = await this.getDocumentsByQuery(
      props,
      context.pipelineId,
      context.workspaceId,
      workflow,
    );

    // update workflow dependencies
    if (result && props.isDependency) {
      this.trackDependencies(workflow, transitionData, result);
    }

    return {
      success: true,
      workflow,
      data: result,
    };
  }
}
