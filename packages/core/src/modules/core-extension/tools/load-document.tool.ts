import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import {
  ContextImportInterface,
  ContextInterface,
  createHash,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
  WorkflowData,
} from '@loopstack/shared';
import { z } from 'zod';
import { FunctionCallService } from '../../common';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';

const LoadDocumentArgsSchema = z.object({
  name: z.string(),
  where: z.object({
    name: z.string(),
  }),
  labels: z.union([z.string(), z.array(z.string()).optional()]),
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
export class LoadDocumentTool implements ToolInterface {
  schema = LoadDocumentArgsSchema;

  constructor(
    private documentService: DocumentService,
    private functionCallService: FunctionCallService,
  ) {}

  /**
   * filters items using defined functions
   */
  applyFilters(props: z.infer<typeof this.schema>, items: DocumentEntity[]) {
    if (props.filter) {
      return items.filter((item) =>
        this.functionCallService.runEval(props.filter!, { item }),
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
    const defaultMapFunction = '{ entity.content }';
    const mapFunc = props.map ?? defaultMapFunction;

    let documents = entities.map((entity) =>
      this.functionCallService.runEval(mapFunc, { entity }),
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
        labels: props.labels as string[],
        ltWorkflowIndex: workflow.index,
      },
    );

    // console.log(query.getQuery(), query.getParameters());

    const entities = props.many
      ? await query.getMany()
      : [await query.getOne()].filter((d) => !!d);

    if (!entities.length && !props.optional) {
      throw new Error(`Document(s) not found.`);
    }

    return this.applyFilters(props, entities);
  }

  /**
   * retrieves and filter related entities from workflow dependencies
   */
  getDocumentsByDependencies(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity,
  ) {
    const previousDependencies =
      workflow.dependencies?.filter((item) => item.name === props.where.name) ??
      [];

    return this.applyFilters(props, previousDependencies);
  }

  /**
   * creates a new list of dependencies, replacing previous items with new while keeping unrelated dependencies untouched
   */
  replacePreviousDependenciesWithCurrent(
    workflow: WorkflowEntity,
    currentEntities: DocumentEntity[],
    previousEntities: DocumentEntity[],
  ): DocumentEntity[] {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    const allEntities = workflow.dependencies ?? [];

    const previousEntityIdSet = new Set(
      previousEntities.map((item) => item?.id).filter(Boolean),
    );

    return [
      ...allEntities.filter((entity) => !previousEntityIdSet.has(entity.id)),
      ...currentEntities,
    ];
  }

  /**
   * compares current dependency ids with new
   * updates the workflow's dependencies and hash, if changed
   */
  updateWorkflowDependenciesIfChanged(
    workflow: WorkflowEntity,
    newDependencies: DocumentEntity[],
  ): boolean {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    const oldDependencies = workflow.dependencies ?? [];
    const oldIds = oldDependencies.map((item) => item.id);
    const newIds = newDependencies.map((item) => item.id);

    const sortedOldIds = [...oldIds].sort();
    const sortedNewIds = [...newIds].sort();

    if (!_.isEqual(sortedOldIds, sortedNewIds)) {
      // ids have changed
      // update the workflow dependency relations and hash value
      workflow.dependenciesHash = newIds.length ? createHash(newIds) : null;
      workflow.dependencies = newDependencies;

      return true;
    }

    return false;
  }

  /**
   * create an import item including previous and current document content
   * adds flags for new and changed content
   */
  createImportItem(
    options: LoadDocumentArgsInterface,
    currentEntities: DocumentEntity[],
    previousEntities: DocumentEntity[],
  ): ContextImportInterface {
    const currentDocuments = this.applyModifiers(options, currentEntities);
    const previousDocuments = this.applyModifiers(options, previousEntities);

    return {
      name: options.name,
      prev: options.many ? previousDocuments : previousDocuments[0],
      curr: options.many ? currentDocuments : currentDocuments[0],
      isNew: !previousDocuments.length,
      isChanged:
        !!previousDocuments.length &&
        !_.isEqual(previousDocuments, currentDocuments),
      options,
    };
  }

  /**
   * add import item to context object
   */
  updateContext(
    data: WorkflowData | undefined,
    props: z.infer<typeof this.schema>,
    currentEntities: DocumentEntity[],
    previousEntities: DocumentEntity[],
  ): WorkflowData {
    if (!data) {
      data = {};
    }

    if (!data.imports) {
      data.imports = {};
    }

    data.imports[props.name] = this.createImportItem(
      props,
      currentEntities,
      previousEntities,
    );

    return data;
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
    data: WorkflowData | undefined,
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    const validProps = this.schema.parse(props);

    // load and filter entities based on options from database
    const currentEntities = await this.getDocumentsByQuery(
      validProps,
      context.projectId,
      context.workspaceId,
      workflow,
    );

    // get and filter entities from workflow dependencies
    const previousEntities = this.getDocumentsByDependencies(
      validProps,
      workflow,
    );

    // update workflow dependencies, if applicable
    if (!validProps.ignoreChanges) {
      const newDependencies = this.replacePreviousDependenciesWithCurrent(
        workflow,
        currentEntities,
        previousEntities,
      );
      this.updateWorkflowDependenciesIfChanged(workflow, newDependencies);
    }

    // update the context, add import data
    data = this.updateContext(
      data,
      validProps,
      currentEntities,
      previousEntities,
    );

    return {
      data,
      workflow,
    };
  }
}
