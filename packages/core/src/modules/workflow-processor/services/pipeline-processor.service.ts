import { Injectable, Logger } from '@nestjs/common';
import { BlockRegistryService } from '../../configuration';
import {
  PipelineSequenceType,
  PipelineFactoryConfigType,
  PipelineItemConfigType,
  NamespacePropsSchema,
  NamespacePropsType,
  PipelineItemSchema,
  PipelineItemType,
} from '@loopstack/shared';
import { NamespaceProcessorService } from './namespace-processor.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { z } from 'zod';
import { ConfigTraceError } from '../../configuration';
import { ServiceStateFactory } from './service-state-factory.service';
import { Factory, Pipeline, Workflow, Workspace } from '../abstract';
import { Block, BlockContext } from '../abstract/block.abstract';
import { BlockHelperService } from './block-helper.service';

const FactoryIteratorItemSchema = z
  .object({
    label: z.string().optional(),
    meta: z.any(), //todo
  })
  .strict();

@Injectable()
export class PipelineProcessorService {
  private readonly logger = new Logger(PipelineProcessorService.name);
  constructor(
    private readonly blockRegistryService: BlockRegistryService,
    private namespaceProcessorService: NamespaceProcessorService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private workflowProcessor: WorkflowProcessorService,
    private readonly serviceStateFactory: ServiceStateFactory,
    private readonly blockHelperService: BlockHelperService,
  ) {}

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.map((part) => part.toString().padStart(4, '0')).join('.');
  }

  async runSequenceType(
    block: Pipeline,
    args: any,
  ): Promise<Pipeline> {

    block.initPipeline(args);
    block = await this.initBlockNamespace(block);

    console.log(block);

    this.logger.debug(`Running Sequence: ${block.name}`);

    const config = block.config as PipelineSequenceType;
    const sequence: PipelineItemConfigType[] = config.sequence;

    this.logger.debug(`Processing sequence with ${sequence.length} items.`)

    // create a new index level
    const index = `${block.context.index}.0`;

    let stepResults: Record<string, any> = {};
    for (let i = 0; i < sequence.length; i++) {
      const item: PipelineItemConfigType = sequence[i];
      const parsedItem = this.templateExpressionEvaluatorService.parse<PipelineItemType>(
        item,
        {
          pipeline: block,
          stepResults,
        },
        {
          schema: PipelineItemSchema,
          omitAliasVariables: true,
          omitUseTemplates: true,
          omitWorkflowData: true,
        },
      );

      if (undefined !== parsedItem.condition && !parsedItem.condition) {
        this.logger.debug(`Skipping execution due to condition: ${parsedItem.id}`);
        continue;
      }

      const currentIndex = this.createIndex(index, i + 1);
      const result = await this.processPipelineItem(
        block,
        parsedItem,
        {
          index: currentIndex,
        },
      );

      const output = result.toOutputObject();
      if (parsedItem.id) {
        stepResults[parsedItem.id] = output;
      }
      stepResults[i.toString()] = output;

      if (result.state.stop) {
        this.logger.debug(`Stopping sequence due to stop sign.`)
        break;
      }
    }

    this.logger.debug(`Processed all sequence items.`)
    return block;
  }

  async prepareAllContexts(
    block: Factory,
    config: PipelineFactoryConfigType,
    items: string[],
  ): Promise<{ context: BlockContext; itemLabel: string; itemIndex: number; }[]> {
    //create a new index level
    const index = `${block.context.index}.0`;

    const blockContexts: { context: BlockContext; itemLabel: string; itemIndex: number; }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const parsedIterator = this.templateExpressionEvaluatorService.parse<{
        label: string;
        meta: any;
      }>(
        {
          label: config.iterator.label,
          meta: config.iterator.meta,
        },
        { this: block.toOutputObject() },
        {
          schema: FactoryIteratorItemSchema,
          omitAliasVariables: true,
          omitUseTemplates: true,
          omitWorkflowData: true,
        },
      );

      const label = parsedIterator.label ?? `${item} (${i + 1})`;
      const metadata = parsedIterator.meta;

      // create a new namespace for each child
      const namespace = await this.namespaceProcessorService.createNamespace(
        block,
        {
          label,
          meta: metadata,
        },
      );

      blockContexts.push({ context: {
          ...block.context,
          namespace,
          labels: [...block.context.labels, namespace.name],
          index: this.createIndex(index, i + 1),
        },
        itemLabel: item,
        itemIndex: i,
      })
    }

    return blockContexts;
  }

  async cloneFactorySetContext(block: Factory, data: { context: BlockContext; itemLabel: string; itemIndex: number; }): Promise<Factory> {
    const clone = await this.serviceStateFactory.createInstanceOf(block);
    clone.initBlock(
      block.name,
      block.metadata,
      block.config,
      data.context,
    );
    clone.initFactory(
      block.args,
    );

    clone.itemIndex = data.itemIndex;
    clone.itemLabel = data.itemLabel;

    return clone;
  }

  async runFactoryType(
    block: Factory,
    args: any,
  ): Promise<Factory> {

    block.initFactory(args);
    block = await this.initBlockNamespace(block);

    this.logger.debug(`Running Factory: ${block.name}`);
    const config = block.config as PipelineFactoryConfigType;

    // omit factory args for later
    const items = this.templateExpressionEvaluatorService.parse<string[]>(
      config.iterator.source,
      { this: block.toOutputObject() },
      {
        schema: z.array(z.string()),
      },
    );

    // create or load all context / namespaces
    const preparedChildData = await this.prepareAllContexts(
      block,
      config,
      items,
    );

    // cleanup old namespaces
    await this.namespaceProcessorService.cleanupNamespace(
      block,
      preparedChildData,
    );

    let processedChildBlocks: Block[] = [];
    if (config.parallel) {
      // process the child elements parallel
      const resultBlocks = preparedChildData.map(async (childData) => {
        const childBlock = await this.cloneFactorySetContext(block, childData);

        const parsedItem = this.templateExpressionEvaluatorService.parse<PipelineItemType>(
          config.factory,
          {
            this: childBlock,
          },
          {
            schema: PipelineItemSchema,
          },
        );

        return this.processPipelineItem(
          childBlock,
          parsedItem,
          childData.context,
        );
      });

      processedChildBlocks = await Promise.all(resultBlocks);
      this.logger.debug(`Processed all parallel factory items.`)
    } else {
      // process the child elements sequential
      for (const childData of preparedChildData) {
        const childBlock = await this.cloneFactorySetContext(block, childData);

        const parsedItem = this.templateExpressionEvaluatorService.parse<PipelineItemType>(
          config.factory,
          {
            this: childBlock,
          },
          {
            schema: PipelineItemSchema,
          },
        );

        const resultBlock = await this.processPipelineItem(
          childBlock,
          parsedItem,
          childData.context,
        );

        processedChildBlocks.push(resultBlock);

        if (resultBlock.state.error || resultBlock.state.stop) {
          break;
        }
      }

      this.logger.debug(`Processed all sequential factory items.`)
    }

    if (processedChildBlocks.some((resultBlock) => resultBlock.state.stop)) {
      this.logger.debug('Stop promoted after factory')
      block.state.stop = true;
    }

    if (processedChildBlocks.some((resultBlock) => resultBlock.state.error)) {
      this.logger.debug('Error promoted after factory')
      block.state.error = true;
    }

    return block;
  }

  async initBlockNamespace<T extends Pipeline | Factory>(block: T): Promise<T> {
    if (block.config.namespace) {
      const namespaceConfig =
        this.templateExpressionEvaluatorService.parse<NamespacePropsType>(
          block.config.namespace,
          { this: block.toOutputObject() },
          {
            schema: NamespacePropsSchema,
            omitAliasVariables: true,
            omitUseTemplates: true,
            omitWorkflowData: true,
          },
        );

      block.context.namespace = await this.namespaceProcessorService.createNamespace(
        block,
        namespaceConfig,
      );
      block.context.labels = [...block.context.labels, block.context.namespace.name];
    }

    return block;
  }

  async processPipelineItem(
    parentBlock: Block,
    item: PipelineItemType,
    contextUpdate?: Partial<BlockContext>,
  ): Promise<Pipeline | Factory | Workflow> {
    this.logger.debug(`Processing pipeline item: ${item.block}`);

    if (!parentBlock.metadata.imports.includes(item.block)) {
      throw new Error(`Item with name ${item.block} not found in scope of ${parentBlock.name}`);
    }

    const blockRegistryItem = this.blockRegistryService.getBlock(item.block);
    if (!blockRegistryItem) {
      throw new Error(`Block with name ${item.block} not found.`)
    }

    const block = await this.serviceStateFactory.createBlockInstance<Block>(blockRegistryItem, {
      ...parentBlock.context,
      ...(contextUpdate ?? {}),
    });

    const parsedArgs = block.metadata.properties?.parse(item.args ?? {});

    try {
      switch (block.type) {
        case 'factory':
          return this.runFactoryType(block as Factory, parsedArgs);
        case 'sequence':
          return this.runSequenceType(block as Pipeline, parsedArgs);
        case 'workflow':
          return this.workflowProcessor.runStateMachineType(block as Workflow, parsedArgs);
      }

      throw new Error(`Unknown type ${block.type}`);
    } catch (e) {
      throw new ConfigTraceError(e, block);
    }
  }
}
