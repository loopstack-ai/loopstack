import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import {
  ContextImportInterface,
  ContextInterface,
  Service,
  ServiceInterface,
  ServiceCallResult, TransitionMetadataInterface,
} from '@loopstack/shared';
import { z } from 'zod';
import { ExpressionEvaluatorService } from '../../common';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import {
  DocumentService,
  WhereCondition,
  WorkflowService,
} from '../../persistence';

const config = z
  .object({
    where: WhereCondition,
    map: z.string().optional(),
    filter: z.string().optional(),
    sort: z.boolean().optional(),
    sortBy: z
      .object({
        iteratees: z.array(z.string()),
        orders: z.array(z.enum(['asc', 'desc'])),
      })
      .optional(),
    many: z.boolean().optional(),
    flat: z.boolean().optional(),
    ignoreChanges: z.boolean().optional(),
    global: z.boolean().optional(),
    optional: z.boolean().optional(),
  })
  .strict();

const schema = config;  //todo create dedicated schema

@Injectable()
@Service({
  config,
  schema,
})
export class LoadDocumentService implements ServiceInterface {
  private readonly logger = new Logger(LoadDocumentService.name);

  constructor(
    private documentService: DocumentService,
    private workflowService: WorkflowService,
    private functionCallService: ExpressionEvaluatorService,
  ) {}

  /**
   * filters items using defined functions
   */
  applyFilters(props: z.infer<typeof schema>, items: DocumentEntity[]) {
    if (props.filter) {
      return items.filter((item) =>
        this.functionCallService.evaluate(props.filter!, { item }),
      );
    }

    return items;
  }

  /**
   * modify items by mapping, flattening and sorting entities
   * uses defined functions for mapping
   */
  applyModifiers(
    props: z.infer<typeof schema>,
    entities: DocumentEntity[],
  ) {
    const defaultMapFunction = '${ entity.content }';
    const mapFunc = props.map ?? defaultMapFunction;

    let documents = entities.map((entity) =>
      this.functionCallService.evaluate(mapFunc, { entity }),
    );

    if (props.flat) {
      documents = documents.flat();
    }

    if (props.sortBy) {
      documents = _.orderBy(
        documents,
        props.sortBy.iteratees,
        props.sortBy.orders,
      );
    }

    if (props.sort) {
      documents = documents.sort();
    }

    return documents;
  }

  /**
   * retrieves and filters entities from database
   */
  async getDocumentsByQuery(
    props: z.infer<typeof schema>,
    projectId: string,
    workspaceId: string,
    workflow: WorkflowEntity,
  ): Promise<DocumentEntity[]> {
    const query = this.documentService.createDocumentsQuery(
      projectId,
      workspaceId,
      props.where,
      {
        isGlobal: !!props.global,
        ltWorkflowIndex: workflow.index,
      },
    );

    this.logger.debug(query.getQuery());
    this.logger.debug(query.getParameters());

    const entities = props.many
      ? await query.getMany()
      : [await query.getOne()].filter((d) => !!d);

    if (!entities.length && !props.optional) {
      throw new Error(`Document(s) not found.`);
    }

    return this.applyFilters(props, entities);
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

  /**
   * create an import item including previous and current document content
   * adds flags for new and changed content
   */
  createImportItem(
    options: z.infer<typeof schema>,
    currentEntities: DocumentEntity[],
    prevImport: ContextImportInterface | undefined,
  ): ContextImportInterface {
    const currentDocuments = this.applyModifiers(options, currentEntities);

    const content = options.many ? currentDocuments : currentDocuments[0];
    return {
      ids: currentEntities.map((entity) => entity.id),
      tags: currentEntities.map((entity) => entity.tags),
      previousContent: prevImport?.content,
      content: content,
      isNew: !prevImport,
      isChanged: !!prevImport && !_.isEqual(prevImport.content, content),
      options,
    };
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
    meta: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(`Load document ${meta.transition}`);

    // load and filter entities based on options from database
    const currentEntities = await this.getDocumentsByQuery(
      props,
      context.projectId,
      context.workspaceId,
      workflow,
    );

    const prevImport: ContextImportInterface | undefined =
      workflow.prevData?.imports?.[meta.transition!];

    // update workflow dependencies, if applicable
    if (!props.ignoreChanges) {
      if (!workflow.dependencies) {
        workflow.dependencies = [];
      }

      if (prevImport) {
        workflow.dependencies = workflow.dependencies.filter(
          (dep) => !prevImport?.ids.includes(dep.id),
        );
      }

      const existingDependencyIds = workflow.dependencies.map((dep) => dep.id);
      const newDependencies = currentEntities.filter(
        (entity) => !existingDependencyIds.includes(entity.id),
      );
      workflow.dependencies.push(...newDependencies);

      this.updateWorkflowDependenciesHash(workflow);
    }

    const importItem = this.createImportItem(
      props,
      currentEntities,
      prevImport,
    );

    return {
      success: true,
      workflow,
      data: importItem,
    };
  }
}
