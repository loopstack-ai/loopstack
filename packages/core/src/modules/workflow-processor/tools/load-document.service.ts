import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import {
  ContextImportInterface,
  ContextInterface,
  Tool,
  WorkflowRunContext,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { z } from 'zod';
import { ExpressionEvaluatorService } from '../../common';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import {
  DocumentService,
  WhereCondition,
  WorkflowService,
} from '../../persistence';

const LoadDocumentArgsSchema = z.object({
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
});

export type LoadDocumentArgsInterface = z.infer<typeof LoadDocumentArgsSchema>;

@Injectable()
@Tool()
export class LoadDocumentService implements ToolInterface {
  private readonly logger = new Logger(LoadDocumentService.name);
  configSchema = LoadDocumentArgsSchema;
  schema = LoadDocumentArgsSchema; //todo remove the expressions

  constructor(
    private documentService: DocumentService,
    private workflowService: WorkflowService,
    private functionCallService: ExpressionEvaluatorService,
  ) {}

  /**
   * filters items using defined functions
   */
  applyFilters(props: z.infer<typeof this.schema>, items: DocumentEntity[]) {
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
    props: z.infer<typeof this.schema>,
    entities: DocumentEntity[],
  ) {
    const defaultMapFunction = '${{ entity.content }}';
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
    props: z.infer<typeof this.schema>,
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
    options: LoadDocumentArgsInterface,
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
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    workflowContext: WorkflowRunContext,
  ): Promise<ToolResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    this.logger.debug(`Load document ${workflowContext.transition}`);

    const validProps = this.schema.parse(props);

    // load and filter entities based on options from database
    const currentEntities = await this.getDocumentsByQuery(
      validProps,
      context.projectId,
      context.workspaceId,
      workflow,
    );

    const prevImport: ContextImportInterface | undefined =
      workflow.prevData?.imports?.[workflowContext.transition!];

    // update workflow dependencies, if applicable
    if (!validProps.ignoreChanges) {
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

    console.log(importItem)

    return {
      workflow,
      data: importItem,
    };
  }
}
