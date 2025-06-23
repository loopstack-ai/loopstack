import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '../../configuration';
import { ContextService, ValueParserService } from '../../common';
import {
  ContextInterface,
  PipelineType,
  PipelineSequenceType,
  PipelineFactoryType,
  PipelineItemType,
  WorkflowType,
} from '@loopstack/shared';
import { NamespaceProcessorService } from './namespace-processor.service';
import { WorkflowProcessorService } from './workflow-processor.service';

@Injectable()
export class PipelineProcessorService {
  private readonly logger = new Logger(PipelineProcessorService.name);
  constructor(
    private loopConfigService: ConfigurationService,
    private namespaceProcessorService: NamespaceProcessorService,
    private contextService: ContextService,
    private valueParserService: ValueParserService,
    private workflowProcessor: WorkflowProcessorService,
  ) {}

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.map((part) => part.toString().padStart(4, '0')).join('.');
  }

  async runSequenceType(
    sequenceConfig: PipelineSequenceType,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const sequence: PipelineItemType[] = sequenceConfig.sequence;

    // create a new index level
    const index = `${context.index}.0`;

    let lastContext = this.contextService.create(context);
    for (let i = 0; i < sequence.length; i++) {
      const item: PipelineItemType = sequence[i];
      const evaluatedItem = this.valueParserService.evalWithContext<{
        name: string;
        condition?: boolean;
      }>(item, { context: lastContext });

      if (evaluatedItem.condition === false) {
        continue;
      }

      lastContext.index = this.createIndex(index, i + 1);
      lastContext = await this.processPipelineItem(item, lastContext);

      if (lastContext.stop) {
        break;
      }
    }

    return lastContext;
  }

  configExists(type: string, name: string): boolean {
    return this.loopConfigService.has(`${type}s`, name);
  }

  async prepareAllContexts(
    context: ContextInterface,
    factory: PipelineFactoryType,
    items: string[],
  ): Promise<ContextInterface[]> {
    //create a new index level
    const index = `${context.index}.0`;

    const contexts: ContextInterface[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const label = factory.iterator.label
        ? this.valueParserService.evalWithContextAndItem<string>(
            factory.iterator.label,
            {
              context,
              item,
              index: i + 1,
            },
          )
        : item.toString();

      const metadata = factory.iterator.meta
        ? this.valueParserService.evalWithContextAndItem<Record<string, any>>(
            factory.iterator.meta,
            {
              context,
              item,
              index: i + 1,
            },
          )
        : undefined;

      // create a new namespace for each child
      const localContext = await this.namespaceProcessorService.createNamespace(
        context,
        {
          label,
          meta: metadata,
        },
      );

      // set the new index
      localContext.index = this.createIndex(index, i + 1);
      contexts.push(localContext);
    }

    return contexts;
  }

  async runFactoryType(
    config: PipelineFactoryType,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const items = this.valueParserService.evalWithContext<string[]>(
      config.iterator.source,
      { context },
    );

    if (!Array.isArray(items)) {
      throw new Error(
        `Iterator values in ${config.iterator.source} must be array, got ${typeof items}`,
      );
    }

    // create or load all context / namespaces
    const preparedChildContexts = await this.prepareAllContexts(
      context,
      config,
      items,
    );

    // cleanup old namespaces
    await this.namespaceProcessorService.cleanupNamespace(
      context,
      preparedChildContexts,
    );

    // process the child elements sequential
    for (const childContext of preparedChildContexts) {
      const tmpContext = await this.processPipelineItem(
        config.factory,
        childContext,
      );

      if (tmpContext.error) {
        context.error = true;
        context.stop = true;
        break;
      }

      if (tmpContext.stop) {
        context.stop = true;
        break;
      }
    }

    return context;
  }

  async runPipelineType(
    pipelineConfig: PipelineType,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    if (pipelineConfig.namespace) {
      context = await this.namespaceProcessorService.createNamespace(
        context,
        pipelineConfig.namespace,
      );
    }

    let updatedContext: ContextInterface | undefined = undefined;
    switch (pipelineConfig.type) {
      case 'root':
      case 'sequence':
        updatedContext = await this.runSequenceType(pipelineConfig as PipelineSequenceType, context);
        break;
      case 'factory':
        updatedContext = await this.runFactoryType(pipelineConfig, context);
        break;
    }

    // if the pipeline item did execute under the same namespace as parent, pass over the updated local context
    if (
      updatedContext &&
      updatedContext.namespace.id === context.namespace.id
    ) {
      return updatedContext;
    }

    if (updatedContext?.error) {
      context.error = true;
    }

    if (updatedContext?.stop) {
      context.stop = true;
    }

    return context;
  }

  async processPipelineItem(
    item: PipelineItemType,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const type = ['tool', 'pipeline', 'workflow'].find((key) => key in item);
    if (!type) {
      console.log(item);
      throw new Error('Unknown pipeline item type.');
    }

    const itemName = item[type];

    this.logger.debug(`Processing item: ${itemName}`);

    if (!this.configExists(type, itemName)) {
      throw new Error(
        `Workflow ${itemName} for factory type ${type} does not exist.`,
      );
    }

    const config = this.loopConfigService.get<any>(`${type}s`, itemName);

    if (!config) {
      throw new Error(
        `Pipeline config "${itemName}" for type ${type} not found.`,
      );
    }

    switch (type) {
      case 'pipeline':
        return this.runPipelineType(config as PipelineType, context);
      case 'workflow':
        return this.workflowProcessor.runStateMachineType(
          config as WorkflowType,
          context,
        );
    }

    throw new Error(`Pipeline type ${type} unknown.`);
  }
}
