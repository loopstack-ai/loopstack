import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import {
  ContextImportInterface,
  ContextInterface,
  createHash,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { z } from 'zod';
import { FunctionCallService } from '../../common';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';

const LoadDocumentArgsSchema = z.object({
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
  private readonly logger = new Logger(LoadDocumentTool.name);
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
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    const deps = workflow.dependencies ?? [];
    const newIds = deps.map((item) => item.id).sort();

    const hash = newIds.length ? createHash(newIds) : null;
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

    const curr = options.many ? currentDocuments : currentDocuments[0];
    return {
      ids: currentEntities.map((entity) => entity.id),
      prev: prevImport?.curr,
      curr: curr,
      isNew: !prevImport,
      isChanged: !!prevImport && !_.isEqual(prevImport.curr, curr),
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
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    this.logger.debug(`Load document ${info.transition}`);

    const validProps = this.schema.parse(props);

    // load and filter entities based on options from database
    const currentEntities = await this.getDocumentsByQuery(
      validProps,
      context.projectId,
      context.workspaceId,
      workflow,
    );

    const prevImport: ContextImportInterface | undefined =
      workflow.prevData?.imports?.[info.transition!];

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

      workflow.dependencies.push(...currentEntities);
      this.updateWorkflowDependenciesHash(workflow);
    }

    const data = this.createImportItem(props, currentEntities, prevImport);

    return {
      data,
      workflow,
    };
  }
}
