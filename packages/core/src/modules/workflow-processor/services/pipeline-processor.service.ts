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
  PipelineFactorySchema,
  PipelineFactoryType,
} from '@loopstack/shared';
import { NamespaceProcessorService } from './namespace-processor.service';
import { WorkflowProcessorService } from './workflow-processor.service';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { z } from 'zod';
import { ConfigTraceError } from '../../configuration';
import { ServiceStateFactory } from './service-state-factory.service';
import { Pipeline, StateMachine, Workspace } from '../abstract';
import { Block, BlockContext } from '../abstract/block.abstract';
import { BlockHelperService } from './block-helper.service';
import { omit } from 'lodash';

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
  ): Promise<Pipeline> {

    this.logger.debug(`Running Sequence: ${block.name}`);

    const config = block.config as PipelineSequenceType;
    const sequence: PipelineItemConfigType[] = config.sequence;

    this.logger.debug(`Processing sequence with ${sequence.length} items.`)

    // create a new index level
    const index = `${block.context.index}.0`;

    let updatedBlock: Pipeline = block;
    for (let i = 0; i < sequence.length; i++) {
      const item: PipelineItemConfigType = sequence[i];
      const parsedItem = this.templateExpressionEvaluatorService.parse<PipelineItemType>(
        omit(item, ['assign']),
        { parent: updatedBlock },
        {
          schema: PipelineItemSchema,
          omitAliasVariables: true,
          omitUseTemplates: true,
          omitWorkflowData: true,
        },
      );

      // keep the original assign expression
      const partiallyParsedItem: PipelineItemType = {
        ...parsedItem,
        assign: item.assign,
      }

      if (partiallyParsedItem.condition === false) {
        this.logger.debug(`Skipping execution due to condition: ${updatedBlock.name}`);
        continue;
      }

      const currentIndex = this.createIndex(index, i + 1);
      updatedBlock = await this.processPipelineItem<Pipeline>(
        updatedBlock,
        partiallyParsedItem,
        {
          index: currentIndex,
        },
      );

      if (updatedBlock.state.stop) {
        this.logger.debug(`Stopping sequence due to stop sign.`)
        break;
      }
    }

    this.logger.debug(`Processed all sequence items.`)
    return updatedBlock;
  }

  async prepareAllContexts(
    block: Pipeline,
    config: PipelineFactoryType,
    items: string[],
  ): Promise<BlockContext[]> {
    //create a new index level
    const index = `${block.context.index}.0`;

    const blockContexts: BlockContext[] = [];
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
        { this: block },
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

      blockContexts.push({
        ...block.context,
        namespace,
        labels: [...block.context.labels, namespace.name],
        iterationLabel: item,
        index: this.createIndex(index, i + 1),
      })
    }

    return blockContexts;
  }

  async clonePipelineSetContext(block: Pipeline, context: BlockContext): Promise<Pipeline> {
    const clone = await this.serviceStateFactory.createInstanceOf(block);
    clone.initBlock(
      block.name,
      block.metadata,
      block.config,
      context,
    );
    clone.initPipeline(
      block.inputs, //todo?
    );

    return clone;
  }

  async runFactoryType(
    block: Pipeline,
  ): Promise<Pipeline> {

    this.logger.debug(`Running Factory: ${block.name}`);
    const config = block.config as PipelineFactoryConfigType;

    const parsedConfig = this.templateExpressionEvaluatorService.parse<PipelineFactoryType>(
      config,
      { this: block },
      {
        schema: PipelineFactorySchema,
        omitAliasVariables: true,
        omitUseTemplates: true,
        omitWorkflowData: true,
      },
    );

    // create or load all context / namespaces
    const preparedChildData = await this.prepareAllContexts(
      block,
      parsedConfig,
      parsedConfig.iterator.source,
    );

    // cleanup old namespaces
    await this.namespaceProcessorService.cleanupNamespace(
      block,
      preparedChildData,
    );

    let processedChildBlocks: Block[] = [];
    if (parsedConfig.parallel) {
      // process the child elements parallel
      const resultBlocks = preparedChildData.map(async (childData) => {
        const childBlock = await this.clonePipelineSetContext(block, childData);
        return this.processPipelineItem(
          childBlock,
          parsedConfig.factory,
          childData,
        );
      });

      processedChildBlocks = await Promise.all(resultBlocks);
      this.logger.debug(`Processed all parallel factory items.`)
    } else {
      // process the child elements sequential
      for (const childData of preparedChildData) {
        const childBlock = await this.clonePipelineSetContext(block, childData);
        const resultBlock = await this.processPipelineItem(
          childBlock,
          parsedConfig.factory,
          childData,
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

  async runPipelineType(
    block: Pipeline,
    args: any,
  ): Promise<Pipeline> {
    block.initPipeline(args);

    if (block.config.namespace) {
      const namespaceConfig =
        this.templateExpressionEvaluatorService.parse<NamespacePropsType>(
          block.config.namespace,
          { this: block },
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

    switch (block.config.type) {
      case 'sequence':
        return this.runSequenceType(block);
      case 'factory':
        return this.runFactoryType(block);
    }
  }

  async processPipelineItem<T extends Block>(
    parentBlock: T,
    item: PipelineItemType,
    contextUpdate?: Partial<BlockContext>,
  ): Promise<T> {
    this.logger.debug(`Processing pipeline item: ${item.name}`);

    if (!parentBlock.metadata.imports.includes(item.name)) {
      throw new Error(`Item with name ${item.name} not found in scope of ${parentBlock.name}`);
    }

    const blockRegistryItem = this.blockRegistryService.getBlock(item.name);
    if (!blockRegistryItem) {
      throw new Error(`Block with name ${item.name} not found.`)
    }

    const block = await this.serviceStateFactory.createBlockInstance<Block>(blockRegistryItem, {
      ...parentBlock.context,
      ...(contextUpdate ?? {}),
    });

    const parsedArgs = block.metadata.inputSchema?.parse(item.args ?? {});

    console.log('parentBlock', parentBlock)
    console.log('block', block)
    console.log('item.args', item.args)
    console.log('parsedArgs', parsedArgs)

    try {
      let resultBlock: Block | undefined;
      switch (block.config.type) {
        case 'factory':
        case 'sequence':
          resultBlock = await this.runPipelineType(block as Pipeline, parsedArgs);
          break;
        case 'stateMachine':
          resultBlock = await this.workflowProcessor.runStateMachineType(block as StateMachine, parsedArgs);
          break;
      }

      if (resultBlock && !resultBlock.state.stop && !resultBlock.state.error) {
        this.logger.debug(`Assigning variables.`)
        this.blockHelperService.assignToTargetBlock(item.assign, resultBlock, parentBlock);
      }
      return parentBlock;
    } catch (e) {
      throw new ConfigTraceError(e, block);
    }
  }
}
