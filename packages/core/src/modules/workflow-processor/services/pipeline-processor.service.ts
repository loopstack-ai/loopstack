import { Injectable, Logger } from '@nestjs/common';
import { Block, BlockRegistryService } from '../../configuration';
import { ContextService } from '../../common';
import {
  ContextInterface,
  PipelineType,
  PipelineSequenceType,
  PipelineFactoryType,
  PipelineItemType,
  NamespacePropsSchema,
  NamespacePropsType,
} from '@loopstack/shared';
import { NamespaceProcessorService } from './namespace-processor.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { z } from 'zod';
import { ConfigTraceError } from '../../configuration';

const SequenceItemSchema = z
  .object({
    workflow: z.string().optional(),
    pipeline: z.string().optional(),
    condition: z.boolean().optional(),
  })
  .strict();

const FactoryIteratorItemSchema = z
  .object({
    label: z.string().optional(),
    meta: z.any(), //todo
  })
  .strict();

const FactoryIteratorSourceSchema = z.array(
  z.union([z.record(z.string(), z.any()), z.string()]),
);

@Injectable()
export class PipelineProcessorService {
  private readonly logger = new Logger(PipelineProcessorService.name);
  constructor(
    private readonly blockRegistryService: BlockRegistryService,
    private namespaceProcessorService: NamespaceProcessorService,
    private contextService: ContextService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private workflowProcessor: WorkflowProcessorService,
  ) {}

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.map((part) => part.toString().padStart(4, '0')).join('.');
  }

  async runSequenceType(
    block: Block,
    context: ContextInterface,
  ): Promise<ContextInterface> {

    this.logger.debug(`Running Sequence: ${block.target.name}`);

    const config = block.config as PipelineSequenceType;
    const sequence: PipelineItemType[] = config.sequence;

    this.logger.debug(`Processing sequence with ${sequence.length} items.`)

    // create a new index level
    const index = `${context.index}.0`;

    let lastContext = this.contextService.create(context);
    for (let i = 0; i < sequence.length; i++) {
      const item: PipelineItemType = sequence[i];
      const evaluatedItem = this.templateExpressionEvaluatorService.parse<{
        name: string;
        condition?: boolean;
      }>(
        item,
        {
          context: lastContext,
        },
        {
          schema: SequenceItemSchema,
          omitAliasVariables: true,
          omitUseTemplates: true,
          omitWorkflowData: true,
        },
      );

      if (evaluatedItem.condition === false) {
        this.logger.debug(`Skipping execution due to condition: ${block.target.name}`);
        continue;
      }

      lastContext.index = this.createIndex(index, i + 1);
      lastContext = await this.processPipelineItem(
        block,
        item,
        lastContext,
      );

      if (lastContext.stop) {
        this.logger.debug(`Stopping sequence due to stop sign.`)
        break;
      }
    }

    this.logger.debug(`Processed all sequence items.`)
    return lastContext;
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

      const parsedIterator = this.templateExpressionEvaluatorService.parse<{
        label: string;
        meta: any;
      }>(
        {
          label: factory.iterator.label,
          meta: factory.iterator.meta,
        },
        {
          context,
          item,
          index: i + 1,
        },
        {
          schema: FactoryIteratorItemSchema,
          omitAliasVariables: true,
          omitUseTemplates: true,
          omitWorkflowData: true,
        },
      );

      const label = parsedIterator.label ?? item;
      const metadata = parsedIterator.meta;

      // create a new namespace for each child
      const localContext = await this.namespaceProcessorService.createNamespace(
        context,
        {
          label,
          meta: metadata,
        },
      );

      // add the current item to context
      localContext.item = item;

      // set the new index
      localContext.index = this.createIndex(index, i + 1);
      contexts.push(localContext);
    }

    return contexts;
  }

  async runFactoryType(
    block: Block,
    context: ContextInterface,
  ): Promise<ContextInterface> {

    this.logger.debug(`Running Factory: ${block.target.name}`);
    const config = block.config as PipelineFactoryType;

    const items = this.templateExpressionEvaluatorService.parse<string[]>(
      config.iterator.source,
      { context },
      {
        schema: FactoryIteratorSourceSchema,
        omitAliasVariables: true,
        omitUseTemplates: true,
        omitWorkflowData: true,
      },
    );

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

    let results: ContextInterface[] = [];
    if (config.parallel) {
      // process the child elements parallel
      const allItems = preparedChildContexts.map((childContext) =>
        this.processPipelineItem(
          block,
          config.factory,
          childContext,
        ),
      );

      results = await Promise.all(allItems);
      this.logger.debug(`Processed all parallel factory items.`)
    } else {
      // process the child elements sequential
      for (const childContext of preparedChildContexts) {
        const resultContext = await this.processPipelineItem(
          block,
          config.factory,
          childContext,
        );

        results.push(resultContext);

        if (resultContext.error || resultContext.stop) {
          break;
        }
      }

      this.logger.debug(`Processed all sequential factory items.`)
    }

    if (results.some((childContext) => childContext.stop)) {
      this.logger.debug('Stop promoted after factory')
      context.stop = true;
    }

    if (results.some((childContext) => childContext.error)) {
      this.logger.debug('Error promoted after factory')
      context.error = true;
    }

    return context;
  }

  async runPipelineType(
    block: Block,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const config = block.config as PipelineType;

    if (config.namespace) {
      const namespaceConfig =
        this.templateExpressionEvaluatorService.parse<NamespacePropsType>(
          config.namespace,
          { context },
          {
            schema: NamespacePropsSchema,
            omitAliasVariables: true,
            omitUseTemplates: true,
            omitWorkflowData: true,
          },
        );

      context = await this.namespaceProcessorService.createNamespace(
        context,
        namespaceConfig,
      );
    }

    let updatedContext: ContextInterface | undefined = undefined;
    switch (config.type) {
      case 'sequence':
        updatedContext = await this.runSequenceType(block, context);
        break;
      case 'factory':
        updatedContext = await this.runFactoryType(block, context);
        break;
    }

    // if the pipeline item did execute under the same namespace as parent, pass over the updated local context
    if (
      updatedContext &&
      updatedContext.namespace.id === context.namespace.id
    ) {
      this.logger.debug(`Updating context within same namespace.`)
      return updatedContext;
    }

    if (updatedContext?.error) {
      this.logger.debug(`Promoting error after pipeline run.`)
      context.error = true;
    }

    if (updatedContext?.stop) {
      this.logger.debug(`Promoting stop after pipeline run.`)
      context.stop = true;
    }

    return context;
  }

  async processPipelineItem(
    parentBlock: Block,
    item: PipelineItemType,
    context: ContextInterface,
  ): Promise<ContextInterface> {
    const type = ['tool', 'pipeline', 'workflow'].find((key) => key in item);
    if (!type) {
      throw new Error(`Unknown pipeline item type ${item}.`);
    }

    const itemName = item[type];

    this.logger.debug(`Processing pipeline item: ${itemName}`);

    if (!parentBlock.metadata.imports.includes(itemName)) {
      throw new Error(`Item with name ${itemName} not found in scope of ${parentBlock.target.name}`);
    }

    const block = this.blockRegistryService.getBlock(itemName);
    if (!block) {
      throw new Error(`Block with name ${itemName} not found.`)
    }

    try {
      switch (block.config.type) {
        case 'factory':
        case 'sequence':
          return await this.runPipelineType(block, context);
        case 'stateMachine':
          return await this.workflowProcessor.runStateMachineType(block, context);
      }
    } catch (e) {
      throw new ConfigTraceError(e, block);
    }

    throw new Error(`Pipeline type ${type} unknown.`);
  }
}
