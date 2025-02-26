import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { Tool } from '../../processor/decorators/tool.decorator';
import {DocumentEntity} from "../../persistence/entities/document.entity";
import _ from 'lodash';
import {createHash} from "@loopstack/shared/dist/utils/create-hash.util";
import {ContextImportInterface} from "../../processor/interfaces/context-import.interface";
import {DocumentService} from "../../persistence/services/document.service";
import {FunctionCallService} from "../../processor/services/function-call.service";

const schema = z.object({
  name: z.string(),
  where: z.object({
    name: z.string(),
    type: z.string().optional(),
  }),
  namespaces: z.any().optional(),
  map: z.string().optional(),
  filter: z.string().optional(),
  sortBy: z.object({
    iteratees: z.array(z.string()),
    orders: z.array(z.enum(["asc", "desc"])),
  }).optional(),
  many: z.boolean().optional(),
  flat: z.boolean().optional(),
  ignoreChanges: z.boolean().optional(),
  global: z.boolean().optional(),
});

export interface LoadDocumentToolOptions extends z.infer<typeof schema> {}

@Injectable()
@Tool()
export class LoadDocumentTool implements ToolInterface {

  constructor(
    private documentService: DocumentService,
    private functionCallService: FunctionCallService,
  ) {}

  /**
   * filters items using defined functions
   */
  applyFilters(options: LoadDocumentToolOptions, items: DocumentEntity[]) {
    if (options.many && options.filter) {
      return items.filter((item) => this.functionCallService.runEval(options.filter!, { item }));
    }

    return items;
  }

  /**
   * modify items by mapping, flattening and sorting entities
   * uses defined functions for mapping
   */
  applyModifiers(options: LoadDocumentToolOptions, entities: DocumentEntity[]) {
    const defaultMapFunction = '{ entity.contents }';
    const mapFunc = options.map ?? defaultMapFunction;

    let documents = entities.map((entity) => this.functionCallService.runEval(mapFunc, { entity }));

    if (options.many && options.flat) {
      documents = documents.flat();
    }

    if (options.sortBy) {
      documents = _.sortBy(documents, options.sortBy.iteratees, options.sortBy.orders);
    }

    return documents;
  }

  /**
   * retrieves and filters entities from database
   */
  async getDocumentsByQuery(options: LoadDocumentToolOptions, target: ProcessStateInterface): Promise<DocumentEntity[]> {
    const query = this.documentService.createQuery(
        target.context.projectId,
        target.context.workspaceId,
        options.where,
        {
          isGlobal: !!options.global,
          namespaces: options.namespaces,
          ltWorkflowIndex: target.workflow!.index,
        },
    );

    const entities = options.many ? await query.getMany() : [await query.getOne()].filter((d) => !!d);
    return this.applyFilters(options, entities);
  }

  /**
   * retrieves and filter related entities from workflow dependencies
   */
  getDocumentsByDependencies(options: LoadDocumentToolOptions, target: ProcessStateInterface) {
    const previousDependencies = target.workflow!.dependencies
        .filter((item) => item.name === options.where.name && (!options.where.type || item.type === options.where.type));

    return this.applyFilters(options, previousDependencies);
  }

  /**
   * creates a new list of dependencies, replacing previous items with new while keeping unrelated dependencies untouched
   */
  replacePreviousDependenciesWithCurrent(target: ProcessStateInterface, currentEntities: DocumentEntity[], previousEntities: DocumentEntity[]): DocumentEntity[] {
    const allEntities = target.workflow!.dependencies;

    const previousEntityIds = previousEntities.map((item) => item.id);
    return [
      ...allEntities.filter((entity) => !previousEntityIds.includes(entity.id)),
      ...currentEntities,
    ];
  }

  /**
   * compares current dependency ids with new
   * updates the workflow's dependencies and hash, if changed
   */
  updateWorkflowDependenciesIfChanged(target: ProcessStateInterface, newDependencies: DocumentEntity[]) {
    const oldDependencies = target.workflow!.dependencies;
    const oldIds = oldDependencies.map((item) => item.id);
    const newIds = newDependencies.map((item) => item.id);
    if (!_.isEqual(oldIds.sort(), newIds.sort())) {
      // ids have changed
      // update the workflow dependency relations and hash value
      target.workflow!.dependenciesHash = createHash(newIds); // todo make sure when validating that hash could be null which is equivalent for no dependencies []!
      target.workflow!.dependencies = newDependencies;
    }
  }

  /**
   * create an import item including previous and current document contents
   * adds flags for new and changed contents
   */
  createImportItem(options: LoadDocumentToolOptions, currentEntities: DocumentEntity[], previousEntities: DocumentEntity[]): ContextImportInterface {
    const currentDocuments = this.applyModifiers(options, currentEntities);
    const previousDocuments = this.applyModifiers(options, previousEntities);

    return {
      name: options.name,
      prev: options.many ? previousDocuments : previousDocuments[0],
      curr: options.many ? currentDocuments : currentDocuments[0],
      isNew: !previousDocuments.length,
      isChanged: !!previousDocuments.length && !_.isEqual(previousDocuments, currentDocuments),
      options,
    }
  }

  /**
   * add import item to context object
   */
  updateContext(processState: ProcessStateInterface, options: LoadDocumentToolOptions, currentEntities: DocumentEntity[], previousEntities: DocumentEntity[]): ProcessStateInterface {
    if (!processState.context.imports) {
      processState.context.imports = [];
    }

    processState.context.imports.push(
        this.createImportItem(options, currentEntities, previousEntities),
    )

    return processState;
  }

  /**
   * import documents based on the defined options
   * tracks differences to previously imported documents
   * and updates workflow dependencies, if applicable
   */
  async apply(data: any, target: ProcessStateInterface, source: ProcessStateInterface): Promise<ProcessStateInterface> {
    const options = schema.parse(data);

    // load and filter entities based on options from database
    const currentEntities = await this.getDocumentsByQuery(options, target);

    // get and filter entities from workflow dependencies
    const previousEntities = this.getDocumentsByDependencies(options, target);

    // update workflow dependencies, if applicable
    if (!options.ignoreChanges) {
      const newDependencies = this.replacePreviousDependenciesWithCurrent(target, currentEntities, previousEntities);
      this.updateWorkflowDependenciesIfChanged(target, newDependencies);
    }

    // update the context, add import data
    return this.updateContext(target, options, currentEntities, previousEntities);
  }
}
