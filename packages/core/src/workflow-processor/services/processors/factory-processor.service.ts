import { Injectable, Logger } from '@nestjs/common';
import {
  BlockContextType,
  BlockExecutionContextDto,
  BlockInterface,
  PipelineExecutionContextDto,
  WorkflowExecution,
} from '@loopstack/common';
import { PipelineFactoryIteratorType } from '@loopstack/contracts/types';
import { Processor, TemplateExpressionEvaluatorService } from '../../../common';
import { BlockProcessor } from '../block-processor.service';
import { NamespaceProcessorService } from '../namespace-processor.service';

@Injectable()
export class FactoryProcessorService implements Processor {
  private readonly logger = new Logger(FactoryProcessorService.name);

  constructor(
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly namespaceProcessorService: NamespaceProcessorService,
    private readonly blockProcessor: BlockProcessor,
  ) {}

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.map((part) => part.toString().padStart(4, '0')).join('.');
  }

  async prepareAllContexts(
    ctx: PipelineExecutionContextDto,
    iterator: PipelineFactoryIteratorType,
  ): Promise<Record<string, BlockContextType>> {
    //create a new index level
    const index = `${ctx.index}.0`;

    const executionContexts: Record<string, BlockContextType> = {};
    for (let i = 0; i < iterator.source.length; i++) {
      const item = iterator.source[i];

      // create a new namespace for each child
      const namespace = await this.namespaceProcessorService.createNamespace(ctx, { label: `${item} (${i + 1})` });

      executionContexts[item] = {
        ...ctx,
        namespace,
        labels: [...ctx.labels, namespace.name],
        index: this.createIndex(index, i + 1),
      };
    }

    return executionContexts;
  }

  private validateAvailable() {
    // name: string, parentBlock: BlockInterface
    // if (!parentBlock.metadata?.imports.some((item) => item.name === name)) {
    //   throw new Error(
    //     `Block ${name} is not available. Make sure to import required blocks to the parent.`,
    //   );
    // }
  }

  async process(block: BlockInterface, args: any, ctx: BlockExecutionContextDto): Promise<WorkflowExecution> {
    // ctx = await this.namespaceProcessorService.initBlockNamespace(block, ctx);
    await this.namespaceProcessorService.initBlockNamespace(block, ctx);

    // this.logger.debug(`Running Factory: ${block.name}`);
    // const config = block.config as unknown as PipelineFactoryConfigType;
    //
    // this.validateAvailable(config.factory.block, block);
    //
    // // omit factory args for later
    // const iterator =
    //   this.templateExpressionEvaluatorService.evaluateTemplate<PipelineFactoryIteratorType>(
    //     config.iterator,
    //     block,
    //     // ['pipeline'],
    //     { schema: PipelineFactoryIteratorSchema },
    //   );
    //
    // // create or load all context / namespaces
    // const executionContexts = await this.prepareAllContexts(ctx, iterator);
    //
    // // cleanup old namespaces
    // await this.namespaceProcessorService.cleanupNamespace(
    //   ctx,
    //   Object.values(executionContexts),
    // );
    //
    // let processedChildBlocks: BlockInterface[] = [];
    // if (config.parallel) {
    //   // process the child elements parallel
    //   const resultBlocks = Object.entries(executionContexts).map(
    //     async ([item, blockContext], index) => {
    //
    //       const childBlock = await this.blockFactory.resolveEntrypoint<
    //         PipelineFactory
    //       >(config.factory.block);
    //
    //       const processedBlock = await this.blockProcessor.processBlock(
    //         childBlock,
    //         {
    //           ...block.args, // include the parent args
    //           index,
    //           label: blockContext.namespace.name,
    //           item,
    //         },
    //         blockContext,
    //         factory
    //       );
    //
    //       const resultData = processedBlock.getResult();
    //       block.addItemResult(item, resultData);
    //       block.addItemResult(index.toString(), resultData);
    //
    //       return processedBlock;
    //     },
    //   );
    //
    //   processedChildBlocks = await Promise.all(resultBlocks);
    //
    //   this.logger.debug(`Processed all parallel factory items.`);
    // } else {
    //   // process the child elements sequential
    //   let index = 0;
    //   for (const key of Object.keys(executionContexts)) {
    //     const blockContext = executionContexts[key];
    //
    //     const childBlock = await this.blockFactory.resolveEntrypoint<
    //       PipelineFactory
    //     >(config.factory.block);
    //
    //     const resultBlock = await this.blockProcessor.processBlock(
    //       childBlock,
    //       {
    //         ...block.args, // include the parent args
    //         index,
    //         label: blockContext.namespace.name,
    //         item: key,
    //       },
    //       blockContext,
    //       factory
    //     );
    //
    //     if (resultBlock.state.error || resultBlock.state.stop) {
    //       break;
    //     }
    //
    //     const resultData = resultBlock.getResult();
    //     block.addItemResult(key, resultData);
    //     block.addItemResult(index.toString(), resultData);
    //
    //     processedChildBlocks.push(resultBlock);
    //
    //     index++;
    //   }
    //
    //   this.logger.debug(`Processed all sequential factory items.`);
    // }

    // todo
    // if (processedChildBlocks.some((resultBlock) => resultBlock.state.stop)) {
    //   this.logger.debug('Stop promoted after factory');
    //   block.state.stop = true;
    // }
    //
    // if (processedChildBlocks.some((resultBlock) => resultBlock.state.error)) {
    //   this.logger.debug('Error promoted after factory');
    //   block.state.error = true;
    // }

    return {} as WorkflowExecution;
  }
}
