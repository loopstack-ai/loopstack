import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '../../interfaces/processor.interface';
import { ProcessorFactory } from '../processor.factory';
import { Factory } from '../../abstract';
import {
  PipelineFactoryConfigType,
  PipelineFactoryIteratorType,
} from '@loopstack/contracts/types';
import {
  PipelineFactoryIteratorSchema,
} from '@loopstack/contracts/schemas';
import { BlockHelperService } from '../block-helper.service';
import { TemplateExpressionEvaluatorService } from '../template-expression-evaluator.service';
import { BlockFactory } from '../block.factory';
import { NamespaceProcessorService } from '../namespace-processor.service';
import { BlockProcessor } from '../block-processor.service';
import {
  BlockContextType,
  BlockInterface,
} from '../../interfaces/block.interface';

@Injectable()
export class FactoryProcessorService implements Processor {
  private readonly logger = new Logger(FactoryProcessorService.name);

  constructor(
    private readonly blockFactory: BlockFactory,
    private readonly blockHelperService: BlockHelperService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly namespaceProcessorService: NamespaceProcessorService,
    private readonly blockProcessor: BlockProcessor,
  ) {}

  async prepareAllContexts(
    block: Factory,
    iterator: PipelineFactoryIteratorType,
  ): Promise<Record<string, BlockContextType>> {
    //create a new index level
    const index = `${block.ctx.index}.0`;

    const executionContexts: Record<string, BlockContextType> = {};
    for (let i = 0; i < iterator.source.length; i++) {
      const item = iterator.source[i];

      // create a new namespace for each child
      const namespace = await this.namespaceProcessorService.createNamespace(
        block,
        { label: `${item} (${i + 1})` },
      );

      executionContexts[item] = {
        ...block.ctx,
        namespace,
        labels: [...block.ctx.labels, namespace.name],
        index: this.blockHelperService.createIndex(index, i + 1),
      };
    }

    return executionContexts;
  }

  async process(block: Factory, factory: ProcessorFactory): Promise<Factory> {
    block = await this.blockHelperService.initBlockNamespace(block);

    this.logger.debug(`Running Factory: ${block.name}`);
    const config = block.config as unknown as PipelineFactoryConfigType;

    // omit factory args for later
    const iterator =
      this.templateExpressionEvaluatorService.evaluateTemplate<PipelineFactoryIteratorType>(
        config.iterator,
        block,
        ['pipeline'],
        PipelineFactoryIteratorSchema,
      );

    // create or load all context / namespaces
    const executionContexts = await this.prepareAllContexts(block, iterator);

    // cleanup old namespaces
    await this.namespaceProcessorService.cleanupNamespace(
      block.ctx,
      Object.values(executionContexts),
    );

    let processedChildBlocks: BlockInterface[] = [];
    if (config.parallel) {
      // process the child elements parallel
      const resultBlocks = Object.entries(executionContexts).map(
        async ([item, blockContext], index) => {
          const childBlock = await this.blockFactory.createBlock(
            config.factory.block,
            {
              ...block.args, // include the parent args
              index,
              label: blockContext.namespace.name,
              item,
            },
            blockContext,
          );

          const processedBlock = await this.blockProcessor.processBlock(
            childBlock,
            factory,
          );
          const resultData = processedBlock.getResult();
          block.addItemResult(item, resultData);
          block.addItemResult(index.toString(), resultData);

          return processedBlock;
        },
      );

      processedChildBlocks = await Promise.all(resultBlocks);

      this.logger.debug(`Processed all parallel factory items.`);
    } else {
      // process the child elements sequential
      let index = 0;
      for (const key of Object.keys(executionContexts)) {
        const blockContext = executionContexts[key];

        const childBlock = await this.blockFactory.createBlock(
          config.factory.block,
          {
            ...block.args, // include the parent args
            index,
            label: blockContext.namespace.name,
            item: key,
          },
          blockContext,
        );

        const resultBlock = await this.blockProcessor.processBlock(
          childBlock,
          factory,
        );
        if (resultBlock.state.error || resultBlock.state.stop) {
          break;
        }

        const resultData = resultBlock.getResult();
        block.addItemResult(key, resultData);
        block.addItemResult(index.toString(), resultData);

        processedChildBlocks.push(resultBlock);

        index++;
      }

      this.logger.debug(`Processed all sequential factory items.`);
    }

    if (processedChildBlocks.some((resultBlock) => resultBlock.state.stop)) {
      this.logger.debug('Stop promoted after factory');
      block.state.stop = true;
    }

    if (processedChildBlocks.some((resultBlock) => resultBlock.state.error)) {
      this.logger.debug('Error promoted after factory');
      block.state.error = true;
    }

    return block;
  }
}
