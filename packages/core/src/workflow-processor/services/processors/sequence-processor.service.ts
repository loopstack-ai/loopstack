import { Injectable, Logger } from '@nestjs/common';
import { ProcessorFactory } from '../processor.factory';
import { PipelineBase } from '../../abstract';
import { PipelineItemSchema } from '@loopstack/contracts/schemas';
import {
  PipelineItemConfigType,
  PipelineItemType,
  PipelineSequenceType,
} from '@loopstack/contracts/types';
import { BlockProcessor } from '../block-processor.service';
import {
  BlockExecutionContextDto,
  BlockInterface, PipelineExecutionContextDto,
  Processor,
  TemplateExpressionEvaluatorService,
} from '../../../common';
import { NamespaceProcessorService } from '../namespace-processor.service';
import { WorkflowExecution } from '../../interfaces/workflow-execution.interface';

@Injectable()
export class SequenceProcessorService implements Processor {
  private readonly logger = new Logger(SequenceProcessorService.name);

  constructor(
    private readonly blockProcessor: BlockProcessor,
    private readonly namespaceProcessorService: NamespaceProcessorService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  private validateAvailable(name: string, parentBlock: BlockInterface) {
    // if (!parentBlock.metadata?.imports.some((item) => item.name === name)) {
    //   throw new Error(
    //     `Block ${name} is not available. Make sure to import required blocks to the parent.`,
    //   );
    // }
  }

  async process(block: PipelineBase, args: any, ctx: BlockExecutionContextDto): Promise<WorkflowExecution> {
    ctx = await this.namespaceProcessorService.initBlockNamespace(block, ctx);

    this.logger.debug(`Running Sequence: ${block.name}`);

    const config = block.config as unknown as PipelineSequenceType;
    const sequence: PipelineItemConfigType[] = config.sequence;

    this.logger.debug(`Processing sequence with ${sequence.length} items.`);

    // create a new index level
    const index = `${ctx.index}.0`;

    // for (let i = 0; i < sequence.length; i++) {
    //   const item: PipelineItemConfigType = sequence[i];
    //
    //   const parsedItem =
    //     this.templateExpressionEvaluatorService.evaluateTemplate<PipelineItemType>(
    //       item,
    //       block,
    //       // ['pipeline'],
    //       { schema: PipelineItemSchema },
    //     );
    //
    //   if (undefined !== parsedItem.condition && !parsedItem.condition) {
    //     this.logger.debug(
    //       `Skipping execution due to condition: ${parsedItem.id}`,
    //     );
    //     continue;
    //   }
    //
    //   this.validateAvailable(parsedItem.block, block);
    //
    //   const currentIndex = this.blockHelperService.createIndex(index, i + 1);
    //
    //   // const childBlock = await this.blockFactory.resolveEntrypoint<
    //   //   Pipeline,
    //   //   PipelineExecutionContextDto
    //   // >(parsedItem.block, parsedItem.args, {
    //   //   ...block.ctx,
    //   //   index: currentIndex,
    //   // });
    //
    //   const childBlock = await this.blockFactory.resolveEntrypoint<
    //     Pipeline
    //   >(parsedItem.block);
    //
    //   const processedCtx = await this.blockProcessor.processBlock(
    //     childBlock,
    //     parsedItem.args,
    //     {
    //       ...ctx,
    //       index: currentIndex,
    //     },
    //     factory
    //   );
    //   const resultData = processedBlock.getResult();
    //
    //   if (parsedItem.id) {
    //     block.addStepResult(parsedItem.id, resultData);
    //   }
    //   block.addStepResult(i.toString(), resultData);
    //
    //   if (processedBlock.state?.stop) {
    //     block.state.stop = true;
    //     this.logger.debug(`Stopping sequence due to stop sign.`);
    //     break;
    //   }
    // }

    this.logger.debug(`Processed all sequence items.`);
    return { } as any;
  }
}
